# Memory API Endpoints

I've added two new endpoints to the Auto Trader API for retrieving memory entries:

1. **Get Memory Entry by ID**
   ```
   GET /api/memory/:id
   ```
   This endpoint retrieves a specific memory entry by its ID. The memory entries include portfolio analyses, trade executions, and trade analyses that have been stored in the Recall Network.

2. **Get Memory Entries by Type**
   ```
   GET /api/memories/:type?limit=10
   ```
   This endpoint retrieves multiple memory entries of a specific type, sorted by timestamp (newest first). The supported types are:
   - `portfolio-analysis` - Portfolio analyses performed by the AI
   - `trade_analysis` - Analyses of specific trades
   - `trade_execution` - Records of executed trades
   - `error` - Error entries
   - `web_search` - Web search results used for analysis

   You can specify a limit parameter to control how many entries to return (default: 10).

The memory entries contain valuable information about the AI's reasoning process, including market analyses and trade decisions, all transparently stored on the Recall Network.
