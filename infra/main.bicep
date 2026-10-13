param location string = 'centralindia'
param sqlLocation string = location
param prefix string = 'azan'
param sqlAdminLogin string = 'sqladminuser'
@secure()
param sqlAdminPassword string

var suffix = uniqueString(resourceGroup().id)
var sqlServerName = '${prefix}-sql-${uniqueString(resourceGroup().id, sqlLocation)}'
var dbName = '${prefix}-db'
var planName = '${prefix}-plan'
var webAppName = '${prefix}-web-${suffix}'

resource sqlServer 'Microsoft.Sql/servers@2023-08-01-preview' = {
  name: sqlServerName
  location: sqlLocation
  properties: {
    administratorLogin: sqlAdminLogin
    administratorLoginPassword: sqlAdminPassword
    minimalTlsVersion: '1.2'
  }
}

resource sqlDb 'Microsoft.Sql/servers/databases@2023-08-01-preview' = {
  parent: sqlServer
  name: dbName
  location: sqlLocation
  sku: { name: 'Basic', tier: 'Basic' }
}

resource fwAzure 'Microsoft.Sql/servers/firewallRules@2023-08-01-preview' = {
  parent: sqlServer
  name: 'AllowAzureServices'
  properties: { startIpAddress: '0.0.0.0', endIpAddress: '0.0.0.0' }
}

resource plan 'Microsoft.Web/serverfarms@2023-12-01' = {
  name: planName
  location: location
  kind: 'linux'
  sku: { name: 'B1', tier: 'Basic' }
  properties: { reserved: true }
}

resource web 'Microsoft.Web/sites@2023-12-01' = {
  name: webAppName
  location: location
  properties: {
    serverFarmId: plan.id
    httpsOnly: true
    siteConfig: { linuxFxVersion: 'NODE|20-lts' }
  }
}

output sqlServerFqdn string = sqlServer.properties.fullyQualifiedDomainName
output dbName string = sqlDb.name
output webAppName string = web.name
output webAppUrl string = 'https://${web.properties.defaultHostName}'
