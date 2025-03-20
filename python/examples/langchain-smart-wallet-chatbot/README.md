# AgentKit CDP Smart Wallet Example - Chatbot Python

This example demonstrates an agent setup as a terminal style chatbot with access to the full set of AgentKit actions. A CDP Smart Wallet will be created and owned by the signer passed into the example.

## Ask the chatbot to engage in the Web3 ecosystem!
- "Transfer a portion of your ETH to a random address"
- "Use the faucet"
- "What is the price of BTC?"

## Requirements
- Python 3.10+
- Poetry for package management and tooling
  - [Poetry Installation Instructions](https://python-poetry.org/docs/#installation)
- [CDP API Key](https://portal.cdp.coinbase.com/access/api)
- [OpenAI API Key](https://platform.openai.com/docs/quickstart#create-and-export-an-api-key)

### Checking Python Version
Before using the example, ensure that you have the correct version of Python installed. The example requires Python 3.10 or higher. You can check your Python version by running:

```bash
python --version
poetry --version
```

## Installation
```bash
poetry install
```

## Run the Chatbot

### Set ENV Vars

You'll need the following API keys:
- [CDP API Key](https://portal.cdp.coinbase.com/access/api)
- [OpenAI API Key](https://platform.openai.com/docs/quickstart#create-and-export-an-api-key)

Once you have them, rename the `.env.local` file to `.env` and make sure you set the API keys to their corresponding environment variables:

#### Required:
  - `CDP_API_KEY_NAME=`
  - `CDP_API_KEY_PRIVATE_KEY=`
  - `OPENAI_API_KEY=`

#### Optional:
  - `PRIVATE_KEY=` *(if not provided, a new key will be generated)*
  - `NETWORK_ID=` *(defaults to base-sepolia if not set)*

```bash
poetry run python chatbot.py
``` 