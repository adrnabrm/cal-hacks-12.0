# brightdata_client.py
import os
import asyncio
from mcp_use.client import MCPClient
from uagents import Agent, Context, Model

class ResearchQuery(Model):
    topic: str

class ResearchResponse(Model):
    topic: str
    urls: list[str]

agent = Agent(
    name="research_agent",
    seed="research_agent_seed",
    endpoint=["http://127.0.0.1:8000/submit"],
)

# Store client at module level
_mcp_client = None

async def get_mcp_client():
    global _mcp_client
    if _mcp_client is None:
        config = {
            "mcpServers": {
                "Bright Data": {
                    "command": "npx",
                    "args": ["@brightdata/mcp"],
                    "env": {
                        "API_TOKEN": os.getenv("BRIGHT_DATA_API_TOKEN")
                    }
                }
            }
        }
        _mcp_client = MCPClient.from_dict(config)
    return _mcp_client

@agent.on_event("startup")
async def startup(ctx: Context):
    """Initialize MCP client on agent startup"""
    await get_mcp_client()
    ctx.logger.info("MCP client initialized")

@agent.on_message(model=ResearchQuery, replies=ResearchResponse)
async def handle_research(ctx: Context, msg: ResearchQuery):
    try:
        client = await get_mcp_client()
        search_tool = await client.get_tool("search_engine")
        res = await search_tool.call({"query": msg.topic})
        urls = [r["url"] for r in res.get("results", [])[:5]]
        await ctx.send(msg.sender, ResearchResponse(topic=msg.topic, urls=urls))
    except Exception as e:
        ctx.logger.error(f"Research failed: {e}")

async def test_standalone():
    """Standalone test function"""
    client = await get_mcp_client()
    
    # List tools
    tools = await client.list_tools()
    print("Available tools:", [t.name for t in tools])

    # Test search
    search_tool = await client.get_tool("search_engine")
    results = await search_tool.call({"query": "latest AI research papers"})
    print("Top results:", results)

    # Test scrape
    if results.get("results"):
        scrape_tool = await client.get_tool("scrape_as_markdown")
        content = await scrape_tool.call({"url": results["results"][0]["url"]})
        print("Scraped markdown:", content["content"][:500])

if __name__ == "__main__":
    # Uncomment one:
    
    # Option 1: Run agent
    agent.run()
    
    # Option 2: Run standalone test
    # asyncio.run(test_standalone())