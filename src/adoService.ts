import Q = require("q");
import ServiceEnpointClient = require("TFS/ServiceEndpoint/ServiceEndpointRestClient");
import Contracts = require("TFS/ServiceEndpoint/Contracts");

export class AdoService {
  private _webApiClient = ServiceEnpointClient.getClient();

  public GetAzureSubscriptions(
    adoProjectname: string
  ): Q.Promise<Contracts.ServiceEndpoint[]> {
    const deferred = Q.defer<Contracts.ServiceEndpoint[]>();
    const azureRmType = "azurerm";

    this._webApiClient
      .getServiceEndpoints(adoProjectname, azureRmType)
      .then((subscriptionResult) => {
        if (subscriptionResult.length > 0) {
          deferred.resolve(subscriptionResult);
        } else {
          deferred.resolve(null);
        }
      });
    return deferred.promise;
  }

  public GetMigrateProjectsMachineSummary(
    adoProjectname: string,
    resourceGroupName: string,
    migrateProjectName: string,
    endpoint: Contracts.ServiceEndpoint
  ): Q.Promise<string[]> {
    const deferred = Q.defer<string[]>();

    const dataSourceUrl = `{{{endpoint.url}}}subscriptions/{{{endpoint.subscriptionId}}}/resourceGroups/${resourceGroupName}/providers/Microsoft.Migrate/migrateProjects/${migrateProjectName}/machines?api-version=2018-09-01-preview`;
    const resultSelector =
      "jsonpath:$.value[*].properties.discoveryData[*].machineName";
    const serviceEndpointRequest = this.GetServieEndpointRequest(
      "",
      dataSourceUrl,
      resultSelector
    );

    this._webApiClient
      .executeServiceEndpointRequest(
        serviceEndpointRequest,
        adoProjectname,
        endpoint.id
      )
      .then((result) => {
        if (result.result) {
          deferred.resolve(result.result);
        } else {
          deferred.resolve(null);
        }
      });
    return deferred.promise;
  }

  public GetResourceGroups(
    adoProjectname: string,
    endpoint: Contracts.ServiceEndpoint
  ): Q.Promise<string[]> {
    const deferred = Q.defer<string[]>();

    const dataSourceName = "AzureResourceGroups";
    const resultSelector = "jsonpath:$.value[*].id";
    const serviceEndpointRequest = this.GetServieEndpointRequest(
      dataSourceName,
      "",
      resultSelector
    );

    this._webApiClient
      .executeServiceEndpointRequest(
        serviceEndpointRequest,
        adoProjectname,
        endpoint.id
      )
      .then((result) => {
        if (result.result) {
          deferred.resolve(result.result);
        } else {
          deferred.resolve(null);
        }
      });
    return deferred.promise;
  }

  public GetMigrateProjects(
    adoProjectname: string,
    resourceGroupName: string,
    endpoint: Contracts.ServiceEndpoint
  ): Q.Promise<string[]> {
    const deferred = Q.defer<string[]>();

    const dataSourceUrl = `{{{endpoint.url}}}subscriptions/{{{endpoint.subscriptionId}}}/resourceGroups/${resourceGroupName}/providers/Microsoft.Migrate/migrateProjects?api-version=2018-09-01-preview`;
    const resultSelector = "jsonpath:$.value[*].name";
    const serviceEndpointRequest = this.GetServieEndpointRequest(
      "",
      dataSourceUrl,
      resultSelector
    );

    this._webApiClient
      .executeServiceEndpointRequest(
        serviceEndpointRequest,
        adoProjectname,
        endpoint.id
      )
      .then((result) => {
        if (result.result) {
          deferred.resolve(result.result);
        } else {
          deferred.resolve(null);
        }
      });
    return deferred.promise;
  }

  public GetMigrateProject(
    adoProjectname: string,
    resourceGroupName: string,
    migrateProjectName: string,
    endpoint: Contracts.ServiceEndpoint
  ): Q.Promise<string> {
    const deferred = Q.defer<string>();

    const dataSourceUrl = `{{{endpoint.url}}}subscriptions/{{{endpoint.subscriptionId}}}/resourceGroups/${resourceGroupName}/providers/Microsoft.Migrate/migrateProjects/${migrateProjectName}?api-version=2018-09-01-preview`;
    const resultSelector = "jsonpath:$";
    const serviceEndpointRequest = this.GetServieEndpointRequest(
      "",
      dataSourceUrl,
      resultSelector
    );

    this._webApiClient
      .executeServiceEndpointRequest(
        serviceEndpointRequest,
        adoProjectname,
        endpoint.id
      )
      .then((result) => {
        if (result.result) {
          deferred.resolve(result.result);
        } else {
          deferred.resolve(null);
        }
      });
    return deferred.promise;
  }

  private GetServieEndpointRequest(
    dataSourceName: string,
    dataSourceUrl: string,
    resultSelector: string
  ): Contracts.ServiceEndpointRequest {
    const dataSourceDetails: Contracts.DataSourceDetails = {
      dataSourceName: dataSourceName,
      dataSourceUrl: dataSourceUrl,
      headers: [],
      initialContextTemplate: "",
      parameters: {},
      requestContent: "",
      requestVerb: "",
      resourceUrl: "",
      resultSelector: resultSelector,
    };

    const resultTransformationDetails: Contracts.ResultTransformationDetails = {
      callbackContextTemplate: "",
      callbackRequiredTemplate: "",
      resultTemplate: "",
    };

    const serviceEndpointRequest: Contracts.ServiceEndpointRequest = {
      dataSourceDetails,
      serviceEndpointDetails: null,
      resultTransformationDetails,
    };
    return serviceEndpointRequest;
  }
}
