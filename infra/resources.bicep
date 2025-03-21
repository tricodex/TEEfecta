@description('The location used for all deployed resources')
param location string = resourceGroup().location

@description('Tags that will be applied to all resources')
param tags object = {}


param autoTraderExists bool
@secure()
param autoTraderDefinition object
param marlinExists bool
@secure()
param marlinDefinition object

@description('Id of the user or app to assign application roles')
param principalId string

var abbrs = loadJsonContent('./abbreviations.json')
var resourceToken = uniqueString(subscription().id, resourceGroup().id, location)

// Monitor application with Azure Monitor
module monitoring 'br/public:avm/ptn/azd/monitoring:0.1.0' = {
  name: 'monitoring'
  params: {
    logAnalyticsName: '${abbrs.operationalInsightsWorkspaces}${resourceToken}'
    applicationInsightsName: '${abbrs.insightsComponents}${resourceToken}'
    applicationInsightsDashboardName: '${abbrs.portalDashboards}${resourceToken}'
    location: location
    tags: tags
  }
}

// Container registry
module containerRegistry 'br/public:avm/res/container-registry/registry:0.1.1' = {
  name: 'registry'
  params: {
    name: '${abbrs.containerRegistryRegistries}${resourceToken}'
    location: location
    tags: tags
    publicNetworkAccess: 'Enabled'
    roleAssignments:[
      {
        principalId: autoTraderIdentity.outputs.principalId
        principalType: 'ServicePrincipal'
        roleDefinitionIdOrName: subscriptionResourceId('Microsoft.Authorization/roleDefinitions', '7f951dda-4ed3-4680-a7ca-43fe172d538d')
      }
      {
        principalId: marlinIdentity.outputs.principalId
        principalType: 'ServicePrincipal'
        roleDefinitionIdOrName: subscriptionResourceId('Microsoft.Authorization/roleDefinitions', '7f951dda-4ed3-4680-a7ca-43fe172d538d')
      }
    ]
  }
}

// Container apps environment
module containerAppsEnvironment 'br/public:avm/res/app/managed-environment:0.4.5' = {
  name: 'container-apps-environment'
  params: {
    logAnalyticsWorkspaceResourceId: monitoring.outputs.logAnalyticsWorkspaceResourceId
    name: '${abbrs.appManagedEnvironments}${resourceToken}'
    location: location
    zoneRedundant: false
  }
}

module autoTraderIdentity 'br/public:avm/res/managed-identity/user-assigned-identity:0.2.1' = {
  name: 'autoTraderidentity'
  params: {
    name: '${abbrs.managedIdentityUserAssignedIdentities}autoTrader-${resourceToken}'
    location: location
  }
}

module autoTraderFetchLatestImage './modules/fetch-container-image.bicep' = {
  name: 'autoTrader-fetch-image'
  params: {
    exists: autoTraderExists
    name: 'auto-trader'
  }
}

var autoTraderAppSettingsArray = filter(array(autoTraderDefinition.settings), i => i.name != '')
var autoTraderSecrets = map(filter(autoTraderAppSettingsArray, i => i.?secret != null), i => {
  name: i.name
  value: i.value
  secretRef: i.?secretRef ?? take(replace(replace(toLower(i.name), '_', '-'), '.', '-'), 32)
})
var autoTraderEnv = map(filter(autoTraderAppSettingsArray, i => i.?secret == null), i => {
  name: i.name
  value: i.value
})

module autoTrader 'br/public:avm/res/app/container-app:0.8.0' = {
  name: 'autoTrader'
  params: {
    name: 'auto-trader'
    ingressTargetPort: 80
    scaleMinReplicas: 1
    scaleMaxReplicas: 10
    secrets: {
      secureList:  union([
      ],
      map(autoTraderSecrets, secret => {
        name: secret.secretRef
        value: secret.value
      }))
    }
    containers: [
      {
        image: autoTraderFetchLatestImage.outputs.?containers[?0].?image ?? 'mcr.microsoft.com/azuredocs/containerapps-helloworld:latest'
        name: 'main'
        resources: {
          cpu: json('0.5')
          memory: '1.0Gi'
        }
        env: union([
          {
            name: 'APPLICATIONINSIGHTS_CONNECTION_STRING'
            value: monitoring.outputs.applicationInsightsConnectionString
          }
          {
            name: 'AZURE_CLIENT_ID'
            value: autoTraderIdentity.outputs.clientId
          }
          {
            name: 'PORT'
            value: '80'
          }
        ],
        autoTraderEnv,
        map(autoTraderSecrets, secret => {
            name: secret.name
            secretRef: secret.secretRef
        }))
      }
    ]
    managedIdentities:{
      systemAssigned: false
      userAssignedResourceIds: [autoTraderIdentity.outputs.resourceId]
    }
    registries:[
      {
        server: containerRegistry.outputs.loginServer
        identity: autoTraderIdentity.outputs.resourceId
      }
    ]
    environmentResourceId: containerAppsEnvironment.outputs.resourceId
    location: location
    tags: union(tags, { 'azd-service-name': 'auto-trader' })
  }
}

module marlinIdentity 'br/public:avm/res/managed-identity/user-assigned-identity:0.2.1' = {
  name: 'marlinidentity'
  params: {
    name: '${abbrs.managedIdentityUserAssignedIdentities}marlin-${resourceToken}'
    location: location
  }
}

module marlinFetchLatestImage './modules/fetch-container-image.bicep' = {
  name: 'marlin-fetch-image'
  params: {
    exists: marlinExists
    name: 'marlin'
  }
}

var marlinAppSettingsArray = filter(array(marlinDefinition.settings), i => i.name != '')
var marlinSecrets = map(filter(marlinAppSettingsArray, i => i.?secret != null), i => {
  name: i.name
  value: i.value
  secretRef: i.?secretRef ?? take(replace(replace(toLower(i.name), '_', '-'), '.', '-'), 32)
})
var marlinEnv = map(filter(marlinAppSettingsArray, i => i.?secret == null), i => {
  name: i.name
  value: i.value
})

module marlin 'br/public:avm/res/app/container-app:0.8.0' = {
  name: 'marlin'
  params: {
    name: 'marlin'
    ingressTargetPort: 80
    scaleMinReplicas: 1
    scaleMaxReplicas: 10
    secrets: {
      secureList:  union([
      ],
      map(marlinSecrets, secret => {
        name: secret.secretRef
        value: secret.value
      }))
    }
    containers: [
      {
        image: marlinFetchLatestImage.outputs.?containers[?0].?image ?? 'mcr.microsoft.com/azuredocs/containerapps-helloworld:latest'
        name: 'main'
        resources: {
          cpu: json('0.5')
          memory: '1.0Gi'
        }
        env: union([
          {
            name: 'APPLICATIONINSIGHTS_CONNECTION_STRING'
            value: monitoring.outputs.applicationInsightsConnectionString
          }
          {
            name: 'AZURE_CLIENT_ID'
            value: marlinIdentity.outputs.clientId
          }
          {
            name: 'PORT'
            value: '80'
          }
        ],
        marlinEnv,
        map(marlinSecrets, secret => {
            name: secret.name
            secretRef: secret.secretRef
        }))
      }
    ]
    managedIdentities:{
      systemAssigned: false
      userAssignedResourceIds: [marlinIdentity.outputs.resourceId]
    }
    registries:[
      {
        server: containerRegistry.outputs.loginServer
        identity: marlinIdentity.outputs.resourceId
      }
    ]
    environmentResourceId: containerAppsEnvironment.outputs.resourceId
    location: location
    tags: union(tags, { 'azd-service-name': 'marlin' })
  }
}
output AZURE_CONTAINER_REGISTRY_ENDPOINT string = containerRegistry.outputs.loginServer
output AZURE_RESOURCE_AUTO_TRADER_ID string = autoTrader.outputs.resourceId
output AZURE_RESOURCE_MARLIN_ID string = marlin.outputs.resourceId
