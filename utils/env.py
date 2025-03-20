"""
Environment variable validator for 4g3n7.

This script validates that all required environment variables are present
for the 4g3n7 secure financial assistant to function properly.

Usage:
    python utils/env.py
"""

import os
import sys
from typing import Dict, List, Optional, Set

# Environment variable requirements for each component
REQUIRED_ENV_VARS = {
    "core": [
        "NODE_ENV"  # 'development' or 'production'
    ],
    "nillion": [
        "NILLION_API_KEY",
        "NILLION_NODE_URL"
    ],
    "recall": [
        "RECALL_API_KEY",
        "RECALL_AGENT_ID",
        "RECALL_PRIVATE_KEY"
    ],
    "coinbase": [
        "COINBASE_CDP_KEY",
        "COINBASE_CDP_SECRET",
        "COINBASE_CDP_CLIENT_KEY"
    ],
    "ethereum": [
        "ETHEREUM_PRIVATE_KEY",
        "ETHEREUM_RPC_URL",
        "ETHERSCAN_API_KEY"
    ],
    "t1": [
        "T1_CONTRACT_ADDRESS"
    ],
    "privy": [
        "PRIVY_APP_ID",
        "PRIVY_APP_SECRET",
        "PRIVY_JWKS_ENDPOINT"
    ],
    "azure": [
        "AZURE_API_KEY",
        "AZURE_SERVICE_ENPOINT"
    ]
}

def validate_environment() -> Dict[str, Dict[str, bool]]:
    """
    Validates all required environment variables and returns validation status.
    
    Returns:
        Dict with component validation status
    """
    # Get all environment variables
    env_vars: Dict[str, str] = dict(os.environ)
    
    # Track validation results
    validation: Dict[str, Dict[str, bool]] = {}
    missing_vars: Set[str] = set()
    
    # Check each component
    for component, required_vars in REQUIRED_ENV_VARS.items():
        validation[component] = {}
        for var in required_vars:
            is_valid = var in env_vars and env_vars[var] and env_vars[var] != "your_placeholder_value"
            validation[component][var] = is_valid
            if not is_valid:
                missing_vars.add(var)
    
    # Print results
    print("\n===== 4g3n7 Environment Validation =====\n")
    
    all_valid = True
    for component, vars_status in validation.items():
        component_valid = all(vars_status.values())
        all_valid = all_valid and component_valid
        status = "✅ VALID" if component_valid else "❌ INVALID"
        print(f"{component.upper()} Component: {status}")
        
        # Show detailed status if component has issues
        if not component_valid:
            for var, is_valid in vars_status.items():
                var_status = "✅" if is_valid else "❌"
                print(f"  {var_status} {var}")
    
    print("\n=======================================")
    if all_valid:
        print("✅ All environment variables are properly configured.")
    else:
        print(f"❌ Missing or invalid environment variables: {len(missing_vars)}")
        print("Please set these variables in your .env file.")
    
    return validation

def is_environment_valid() -> bool:
    """
    Check if all required environment variables are valid.
    
    Returns:
        True if all variables are valid, False otherwise
    """
    validation = validate_environment()
    return all(all(var_status.values()) for var_status in validation.values())

if __name__ == "__main__":
    # Run validation
    if is_environment_valid():
        sys.exit(0)  # Success
    else:
        sys.exit(1)  # Failure
