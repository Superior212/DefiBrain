from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Dict, Any
import uvicorn
import logging
import os
from transformers import pipeline
import asyncio
from datetime import datetime
import google.generativeai as genai
from dotenv import load_dotenv

# Load environment variables from .env file if it exists
load_dotenv()

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Initialize Gemini client
try:
    # Try to get Gemini API key from environment
    gemini_api_key = os.getenv("GEMINI_API_KEY")
    if gemini_api_key:
        genai.configure(api_key=gemini_api_key)
        gemini_model = genai.GenerativeModel('gemini-1.5-flash')
        logger.info("Gemini API client initialized successfully")
    else:
        gemini_model = None
        logger.warning("GEMINI_API_KEY not found in environment variables")
except Exception as e:
    logger.warning(f"Failed to initialize Gemini client: {e}")
    gemini_model = None

# Fallback: Try to load local transformers model
ai_generator = None
if not gemini_model:
    try:
        ai_generator = pipeline(
            "text-generation",
            model="microsoft/DialoGPT-medium",
            tokenizer="microsoft/DialoGPT-medium",
            device=-1  # Use CPU
        )
        logger.info("Local AI chat model loaded successfully")
    except Exception as e:
        logger.warning(f"Failed to load local AI model, using enhanced rule-based responses: {e}")
        ai_generator = None

app = FastAPI(
    title="DefiBrain AI Backend",
    description="AI-powered DeFi analytics and optimization platform",
    version="1.0.0"
)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://127.0.0.1:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Pydantic models
class PortfolioData(BaseModel):
    portfolio_data: Dict[str, Any]
    vault_info: Dict[str, Any]
    tokens: List[str]

class PricePredictionRequest(BaseModel):
    tokens: List[str]

class YieldOptimizationRequest(BaseModel):
    portfolio_data: Dict[str, Any]

class MarketAnalysisRequest(BaseModel):
    tokens: List[str]

class ChatRequest(BaseModel):
    message: str
    portfolio_data: Dict[str, Any] = None
    chat_history: List[Dict[str, Any]] = []

# AI Response Generation
async def generate_ai_response(user_message: str, portfolio_data: Dict[str, Any] = None) -> tuple[str, bool]:
    """Generate AI-powered response using Gemini API or fallback models"""
    try:
        # Try Gemini API first
        if gemini_model:
            # Prepare context with portfolio data
            system_prompt = "You are a DeFi (Decentralized Finance) expert assistant. Provide helpful, accurate, and actionable advice about DeFi strategies, yield farming, liquidity provision, risk management, and portfolio optimization. Keep responses concise but informative."
            
            user_context = f"{system_prompt}\n\nUser question: {user_message}"
            if portfolio_data:
                total_value = portfolio_data.get('totalValue', 0)
                if isinstance(total_value, str):
                    total_value = float(total_value) if total_value else 0
                user_context += f"\n\nUser's portfolio context: Total value ${total_value:.2f} with portfolio data available."
            
            # Make Gemini API call
            response = await asyncio.to_thread(
                gemini_model.generate_content,
                user_context
            )
            
            ai_response = response.text.strip()
            # Remove markdown formatting
            clean_response = ai_response.replace('**', '')
            if clean_response and len(clean_response) > 10:
                return clean_response, True
        
        # Fallback to local transformers model
        if ai_generator:
            # Create context-aware prompt for DeFi
            context = f"You are a DeFi AI assistant helping users with decentralized finance strategies. User asks: {user_message}"
            
            if portfolio_data:
                total_value = portfolio_data.get('totalValue', 0)
                if isinstance(total_value, str):
                    total_value = float(total_value) if total_value else 0
                context += f" User's portfolio value: ${total_value:.2f}"
            
            # Use AI model for response
            response = ai_generator(
                context,
                max_length=150,
                num_return_sequences=1,
                temperature=0.7,
                do_sample=True,
                pad_token_id=ai_generator.tokenizer.eos_token_id
            )
            ai_response = response[0]['generated_text'].replace(context, '').strip()
            # Remove markdown formatting
            clean_response = ai_response.replace('**', '')
            
            # Ensure DeFi relevance
            if len(clean_response) > 10 and any(keyword in clean_response.lower() for keyword in ['defi', 'yield', 'strategy', 'portfolio', 'risk', 'token']):
                return clean_response, True
        
        # Enhanced fallback responses with more intelligence
        return generate_enhanced_response(user_message, portfolio_data), False
        
    except Exception as e:
        logger.error(f"Error generating AI response: {e}")
        return generate_enhanced_response(user_message, portfolio_data), False

def generate_enhanced_response(user_message: str, portfolio_data: Dict[str, Any] = None) -> str:
    """Enhanced rule-based responses with portfolio context"""
    user_message = user_message.lower()
    
    # Portfolio context
    portfolio_context = ""
    if portfolio_data:
        total_value = portfolio_data.get('totalValue', 0)
        if isinstance(total_value, str):
            total_value = float(total_value) if total_value else 0
        if total_value > 0:
            portfolio_context = f" With your current portfolio value of ${total_value:.2f}, "
    
    # More intelligent keyword matching
    if any(word in user_message for word in ['strategy', 'recommend', 'advice', 'what should']):
        return f"Based on current DeFi market conditions,{portfolio_context}I recommend a diversified approach: 40% in established protocols like Aave or Compound for stable yields (3-8% APY), 30% in liquidity provision on Uniswap V3 for higher returns (8-15% APY), and 30% in emerging opportunities. Always consider your risk tolerance and market volatility."
    
    elif any(word in user_message for word in ['risk', 'safe', 'secure', 'protection']):
        return f"Risk management is crucial in DeFi.{portfolio_context}Consider these strategies: diversify across multiple protocols, use established platforms with strong track records, implement stop-losses, and never invest more than you can afford to lose. Blue-chip DeFi protocols like Aave, Compound, and Uniswap offer relatively lower risk profiles."
    
    elif any(word in user_message for word in ['yield', 'apy', 'earn', 'profit', 'return']):
        base_response = f"Current DeFi yields vary significantly:{portfolio_context}Stablecoin farming: 3-8% APY (low risk), LP provision: 8-15% APY (medium risk), Leveraged farming: 15-50% APY (high risk). "
        if portfolio_data and total_value > 0:
            potential_8pct = total_value * 0.08
            potential_15pct = total_value * 0.15
            base_response += f"With your portfolio, you could potentially earn ${potential_8pct:.2f} annually at 8% APY or ${potential_15pct:.2f} at 15% APY."
        return base_response
    
    elif any(word in user_message for word in ['market', 'price', 'trend', 'analysis']):
        return "Current market analysis shows mixed signals across DeFi. ETH is showing consolidation patterns, while DeFi governance tokens are gaining momentum. Key factors to watch: Fed policy, regulatory developments, and protocol innovations. Consider dollar-cost averaging for new positions and monitoring key support/resistance levels."
    
    elif any(word in user_message for word in ['beginner', 'start', 'new', 'how to']):
        if portfolio_data and total_value == 0:
            return f"Since your portfolio is currently empty, focus on education before investing. Learn about: Smart Contract Audits: Crucial for identifying security risks before investing in any DeFi protocol. Look for audits by reputable firms. Impermanent Loss: Understand this risk inherent in liquidity provision. It's the potential loss compared to simply holding assets. Risk Tolerance: Define your risk appetite. High yield often means high risk. Start small with lower-risk strategies. Diversification: Don't put all your eggs in one basket. Spread investments across different protocols and assets. Gas Fees: Factor in transaction fees (especially on Ethereum) which can eat into profits. Start by researching reputable DeFi protocols and understanding their mechanics before committing any funds. Consider using smaller amounts initially to gain practical experience."
        return "Welcome to DeFi! For beginners, I recommend starting with: 1) Learn the basics (wallets, gas fees, smart contracts), 2) Start small with established protocols like Aave or Compound, 3) Use stablecoins initially to understand mechanics, 4) Gradually explore liquidity provision and yield farming, 5) Always DYOR (Do Your Own Research) and never invest more than you can afford to lose."
    
    elif any(word in user_message for word in ['gas', 'fees', 'cost', 'expensive']):
        return "Gas fees can significantly impact DeFi returns, especially for smaller amounts. Strategies to minimize costs: 1) Use Layer 2 solutions (Polygon, Arbitrum, Optimism), 2) Batch transactions when possible, 3) Monitor gas prices and transact during low-usage periods, 4) Consider protocols with lower fees, 5) Factor gas costs into your yield calculations."
    
    elif any(word in user_message for word in ['hello', 'hi', 'hey']):
        return f"Hello! I'm your AI-powered DeFi assistant.{portfolio_context}I can help you with portfolio optimization, yield strategies, risk assessment, market analysis, and protocol recommendations. What specific aspect of DeFi would you like to explore today?"
    
    else:
        return "I'm here to help with your DeFi journey! I can provide insights on portfolio optimization, yield strategies, risk management, market analysis, and protocol recommendations. Could you be more specific about what you'd like to know? For example, ask about yield farming strategies, risk assessment, or market trends."

# Health check endpoint
@app.get("/health")
async def health_check():
    return {"status": "healthy", "message": "AI Backend is running"}

# Portfolio insights endpoint
@app.post("/api/v1/portfolio/insights")
async def get_portfolio_insights(request: PortfolioData):
    try:
        # Mock AI insights for now
        insights = [
            {
                "id": "ai-opportunity-1",
                "type": "opportunity",
                "title": "AI-Detected High Yield Opportunity",
                "description": "Machine learning models suggest optimal allocation to high-yield protocols.",
                "confidence": 0.92,
                "impact": "high",
                "actionable": True,
                "timestamp": 1640995200000
            },
            {
                "id": "ai-risk-1",
                "type": "risk",
                "title": "Market Volatility Alert",
                "description": "AI sentiment analysis indicates increased market volatility. Consider risk management.",
                "confidence": 0.87,
                "impact": "medium",
                "actionable": True,
                "timestamp": 1640995200000
            }
        ]
        
        return {"insights": insights}
    except Exception as e:
        logger.error(f"Error generating portfolio insights: {e}")
        raise HTTPException(status_code=500, detail="Failed to generate insights")

# Price prediction endpoint
@app.post("/api/v1/predict/price")
async def predict_prices(request: PricePredictionRequest):
    try:
        # Mock price predictions
        predictions = {}
        for token in request.tokens:
            predictions[token] = {
                "price": 2500.0 if token == "ETH" else 45000.0 if token == "BTC" else 1.0,
                "confidence": 0.85,
                "timeframe": "24h",
                "trend": "bullish"
            }
        
        return {"predictions": predictions}
    except Exception as e:
        logger.error(f"Error predicting prices: {e}")
        raise HTTPException(status_code=500, detail="Failed to predict prices")

# Yield optimization endpoint
@app.post("/api/v1/optimize/yield")
async def optimize_yield(request: YieldOptimizationRequest):
    try:
        # Mock yield optimization
        recommendations = [
            {
                "protocol": "Aave",
                "apy": 12.5,
                "risk_score": 0.3,
                "allocation_percentage": 40
            },
            {
                "protocol": "Compound",
                "apy": 10.2,
                "risk_score": 0.25,
                "allocation_percentage": 35
            },
            {
                "protocol": "Yearn",
                "apy": 15.8,
                "risk_score": 0.45,
                "allocation_percentage": 25
            }
        ]
        
        return {
            "recommendations": recommendations,
            "expected_yield": 12.8,
            "risk_assessment": "medium"
        }
    except Exception as e:
        logger.error(f"Error optimizing yield: {e}")
        raise HTTPException(status_code=500, detail="Failed to optimize yield")

# Market analysis endpoint
@app.post("/api/v1/analyze/market")
async def analyze_market(request: MarketAnalysisRequest):
    try:
        # Mock market analysis
        signals = {}
        for token in request.tokens:
            signals[token] = {
                "signal": "buy" if token == "ETH" else "hold",
                "strength": 0.75,
                "indicators": {
                    "rsi": 45.2,
                    "macd": 0.12,
                    "moving_average": 2480.0
                },
                "sentiment": 0.65
            }
        
        return {
            "signals": signals,
            "market_sentiment": "bullish",
            "volatility_index": 0.35
        }
    except Exception as e:
        logger.error(f"Error analyzing market: {e}")
        raise HTTPException(status_code=500, detail="Failed to analyze market")

# AI Chat endpoint
@app.post("/api/v1/chat")
async def ai_chat(request: ChatRequest):
    try:
        user_message = request.message
        portfolio_data = request.portfolio_data or {}
        
        # Generate AI-powered response
        response, ai_used = await generate_ai_response(user_message, portfolio_data)
        
        # Generate contextual suggestions based on the message
        suggestions = generate_contextual_suggestions(user_message)
        
        return {
            "response": response,
            "timestamp": datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
            "confidence": 0.95 if ai_used and gemini_model else (0.92 if ai_used and ai_generator else 0.85),
            "suggestions": suggestions,
            "ai_powered": ai_used
        }
    except Exception as e:
        logger.error(f"Error in AI chat: {e}")
        return {"error": "Failed to process chat message", "details": str(e)}

def generate_contextual_suggestions(user_message: str) -> List[str]:
    """Generate contextual suggestions based on user message"""
    user_message = user_message.lower()
    
    if any(word in user_message for word in ['strategy', 'recommend']):
        return [
            "What's the best yield farming strategy?",
            "How can I reduce portfolio risk?",
            "Show me current market trends",
            "Compare different DeFi protocols"
        ]
    elif any(word in user_message for word in ['risk', 'safe']):
        return [
            "What are the safest DeFi protocols?",
            "How to diversify my portfolio?",
            "Tell me about insurance options",
            "Explain impermanent loss"
        ]
    elif any(word in user_message for word in ['yield', 'apy', 'earn']):
        return [
            "Compare yield farming vs staking",
            "What's the current best APY?",
            "How to compound my earnings?",
            "Explain liquidity mining"
        ]
    elif any(word in user_message for word in ['market', 'price', 'trend']):
        return [
            "Analyze ETH price trends",
            "What's driving DeFi growth?",
            "Show me top performing tokens",
            "Predict next market movement"
        ]
    else:
        return [
            "Optimize my portfolio",
            "Find high-yield opportunities",
            "Assess my risk level",
            "Analyze market conditions"
        ]

if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8001)