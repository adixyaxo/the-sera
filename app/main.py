# app/main.py
from fastapi import FastAPI, WebSocket, WebSocketDisconnect, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
import json
import uuid
from datetime import datetime
from typing import Dict, List, Optional, Any
import os
from dotenv import load_dotenv

# Load environment variables FIRST - before any other imports
load_dotenv(".env")

print("🔧 Environment check:")
print(f"   GEMINI_API_KEY present: {bool(os.getenv('GEMINI_API_KEY'))}")
print(f"   Working directory: {os.getcwd()}")

# Now import components with proper error handling
try:
    # Try to import the real Gemini client first
    from app.gemini_client import GeminiClient
    gemini = GeminiClient()
    GEMINI_AVAILABLE = True
    print("✅ Real Gemini client loaded successfully")
except Exception as e:
    print(f"❌ Real Gemini client failed: {e}")
    print("🔧 Falling back to simple test client...")
    try:
        # Fallback to simple client
        from app.simple_gemini import SimpleGeminiClient
        gemini = SimpleGeminiClient()
        GEMINI_AVAILABLE = False
        print("✅ Simple test client loaded successfully")
    except Exception as fallback_error:
        print(f"❌ Even fallback client failed: {fallback_error}")
        print("🔄 Creating emergency fallback...")
        # Emergency fallback
        class EmergencyClient:
            async def process_user_query(self, text, user_id):
                return [{
                    "card_id": str(uuid.uuid4()),
                    "type": "schedule", 
                    "title": "Emergency Card",
                    "description": f"Processing: {text}",
                    "primary_action": {"event_title": "Event"},
                    "status": "pending",
                    "user_id": user_id,
                    "created_at": datetime.utcnow().isoformat()
                }]
            async def health_check(self): return "emergency"
            async def process_card_action(self, *args, **kwargs): 
                return {"message": "Action processed"}
        gemini = EmergencyClient()
        GEMINI_AVAILABLE = False

from app.websocket_manager import ConnectionManager
from app.database import DatabaseManager

# Lifespan events
@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup
    await db.init_db()
    print("🚀 SERA Backend starting up...")
    print(f"🔧 Gemini API: {'Available' if GEMINI_AVAILABLE else 'Test Mode'}")
    yield
    # Shutdown
    print("🛑 SERA Backend shutting down...")

app = FastAPI(
    title="SERA Backend", 
    version="1.0.0", 
    lifespan=lifespan
)

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Initialize components
websocket_manager = ConnectionManager()
db = DatabaseManager()

# Storage
active_cards: Dict[str, Dict] = {}

@app.post("/api/capture/text")
async def capture_text(request: dict):
    """Process text and generate cards"""
    try:
        session_id = str(uuid.uuid4())
        user_text = request.get("text", "")
        user_id = request.get("user_id", "default_user")
        
        print(f"📝 Processing: {user_text}")
        
        # Process with Gemini or fallback
        cards = await gemini.process_user_query(user_text, user_id)
        
        # Store cards
        for card in cards:
            await db.store_card(card)
            active_cards[card["card_id"]] = card
        
        # Store session
        await db.store_session(session_id, user_id, cards)
        
        # Send via WebSocket
        await websocket_manager.send_personal_message({
            "type": "new_cards",
            "session_id": session_id,
            "cards": cards
        }, user_id)
        
        return {
            "session_id": session_id,
            "cards": cards,
            "status": "success"
        }
    except Exception as e:
        raise HTTPException(500, f"Processing failed: {str(e)}")

@app.post("/api/cards/{card_id}/action")
async def handle_card_action(card_id: str, action: dict):
    """Handle card actions"""
    try:
        card = active_cards.get(card_id)
        if not card:
            raise HTTPException(404, "Card not found")
        
        action_type = action.get("action", "")
        user_id = action.get("user_id", "default_user")
        
        # Process action
        result = await gemini.process_card_action(card_id, action_type, action.get("modifications"))
        
        # Update card
        await db.update_card_status(card_id, action_type)
        card["status"] = action_type
        
        # Notify clients
        await websocket_manager.broadcast({
            "type": "card_updated",
            "card_id": card_id,
            "action": action_type
        })
        
        return {
            "card_id": card_id,
            "status": action_type,
            "success": True
        }
    except Exception as e:
        raise HTTPException(500, f"Action failed: {str(e)}")

@app.get("/api/user/{user_id}/cards")
async def get_user_cards(user_id: str):
    """Get user cards"""
    try:
        cards = await db.get_user_cards(user_id)
        return {
            "user_id": user_id,
            "cards": cards,
            "count": len(cards)
        }
    except Exception as e:
        raise HTTPException(500, f"Failed to get cards: {str(e)}")

@app.websocket("/ws/{user_id}")
async def websocket_endpoint(websocket: WebSocket, user_id: str):
    """WebSocket connection"""
    await websocket_manager.connect(websocket, user_id)
    try:
        while True:
            data = await websocket.receive_text()
            message = json.loads(data)
            
            if message.get("type") == "ping":
                await websocket.send_text(json.dumps({"type": "pong"}))
                
    except WebSocketDisconnect:
        websocket_manager.disconnect(user_id)

@app.get("/api/health")
async def health_check():
    """Health check"""
    gemini_health = await gemini.health_check()
    return {
        "status": "healthy",
        "gemini": gemini_health,
        "mode": "normal" if GEMINI_AVAILABLE else "test/fallback",
        "timestamp": datetime.utcnow().isoformat()
    }

@app.get("/")
async def root():
    return {
        "message": "SERA Backend API", 
        "status": "running",
        "mode": "normal" if GEMINI_AVAILABLE else "test/fallback"
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000, reload=True)