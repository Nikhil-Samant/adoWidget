import Q = require("q");
import Contracts = require("Charts/Contracts");
import Service = require("Charts/Services");
import WidgetHelpers = require("TFS/Dashboards/WidgetHelpers");
import ServiceEnpointClient = require("TFS/ServiceEndpoint/ServiceEndpointRestClient");
import ServiceEnpointContracts = require("TFS/ServiceEndpoint/Contracts");

export class ReplicateWiget {
  private currentSettings: ISettings;

  constructor(public widgetHelpers: typeof WidgetHelpers) {}

  public load(widgetSettings) {
    return this.showReplicationStatus(widgetSettings);
  }

  public reload(widgetSettings) {
    return this.showReplicationStatus(widgetSettings);
  }

  private showReplicationStatus(widgetSettings) {
    try {
      this.parseSettings(widgetSettings);
      if (
        this.currentSettings.resourceGroupName &&
        this.currentSettings.migrateProjectName
      ) {
        this.getAzureSubscriptions().then((subscriptions) => {
          const endpoint = subscriptions.filter(
            (sub) =>
              sub.data.subscriptionId ===
              this.currentSettings.azureSubscriptionId
          );
          this.getMigrateProjectsMachineSummary(
            this.currentSettings.resourceGroupName,
            this.currentSettings.migrateProjectName,
            endpoint[0]
          ).then((result) => console.log(result));
        });
      }
      this.renderWidget();
      return this.widgetHelpers.WidgetStatusHelper.Success();
    } catch (e) {
      // Satisfy the linter
    }
  }

  private parseSettings(widgetSettings) {
    this.currentSettings = JSON.parse(
      widgetSettings.customSettings.data
    ) as ISettings;

    if (!this.currentSettings) {
      this.currentSettings = {
        name: widgetSettings.name,
        azureSubscriptionId: "",
        resourceGroupName: "",
        migrateProjectName: "",
      };
    }

    this.currentSettings.name = widgetSettings.name;
  }

  private renderWidget() {
    const $title = $("h2.widget-title");
    const $subtitle = $("h4.subtitle");
    const $container = $("#Chart-Container");
    $container.empty();
    $title.text(this.currentSettings.name);
    $subtitle.text(this.currentSettings.migrateProjectName)

    const chartService = this.buildChartService();
    const chartOptions: Contracts.CommonChartOptions = {
      hostOptions: {
        height: 260,
        width: 300,
      },
      chartType: Contracts.ChartTypesConstants.Pie,
      series: [
        {
          data: [11, 4, 3],
        },
      ],
      xAxis: {
        labelValues: ["Healthy", "Warning", "Critical"],
      },
      specializedOptions: {
        showLabels: true,
        size: "200",
      },
    };

    chartService.then((service) => {
      service.createChart($container, chartOptions);
    });
  }

  private buildChartService(): IPromise<Service.IChartsService> {
    const chartService = Service.ChartsService.getService();
    return chartService;
  }

  private getAzureSubscriptions(): Q.Promise<
    ServiceEnpointContracts.ServiceEndpoint[]
  > {
    const deferred = Q.defer<ServiceEnpointContracts.ServiceEndpoint[]>();
    const webContext = VSS.getWebContext();
    const webApiClient = ServiceEnpointClient.getClient();
    webApiClient
      .getServiceEndpoints(webContext.project.name, "azurerm")
      .then((subscriptionResult) => {
        if (subscriptionResult.length > 0) {
          deferred.resolve(subscriptionResult);
        } else {
          deferred.resolve(null);
        }
      });
    return deferred.promise;
  }

  private getMigrateProjectsMachineSummary(
    resourceGroupName: string,
    migrateProjectName: string,
    endpoint: ServiceEnpointContracts.ServiceEndpoint
  ): Q.Promise<string[]> {
    const deferred = Q.defer<string[]>();
    const webContext = VSS.getWebContext();
    const dataSourceDetails: ServiceEnpointContracts.DataSourceDetails = {
      dataSourceName: "",
      dataSourceUrl:
        "{{{endpoint.url}}}subscriptions/{{{endpoint.subscriptionId}}}/resourceGroups/" +
        resourceGroupName +
        "/providers/Microsoft.Migrate/migrateProjects/" +
        migrateProjectName +
        "/machines?api-version=2018-09-01-preview",
      headers: [],
      initialContextTemplate: "",
      parameters: {},
      requestContent: "",
      requestVerb: "",
      resourceUrl: "",
      resultSelector: "jsonpath:$.value[*].properties.discoveryData[*].machineName",
    };

    const resultTransformationDetails: ServiceEnpointContracts.ResultTransformationDetails =
      {
        callbackContextTemplate: "",
        callbackRequiredTemplate: "",
        resultTemplate: "",
      };

    const serviceEndpointRequest: ServiceEnpointContracts.ServiceEndpointRequest =
      {
        dataSourceDetails,
        serviceEndpointDetails: null,
        resultTransformationDetails,
      };
    const webApiClient = ServiceEnpointClient.getClient();
    webApiClient
      .executeServiceEndpointRequest(
        serviceEndpointRequest,
        webContext.project.name,
        endpoint.id
      )
      .then((result) => {
        console.log(result);
        if (result.result) {
          deferred.resolve(result.result);
        } else {
          deferred.resolve(null);
        }
      });
    return deferred.promise;
  }
}

VSS.require(["TFS/Dashboards/WidgetHelpers"], (WidgetHelpers) => {
  WidgetHelpers.IncludeWidgetStyles();
  VSS.register("AzureMigrateReplicationReport", () => {
    const replicateWidget = new ReplicateWiget(WidgetHelpers);
    return replicateWidget;
  });
  VSS.notifyLoadSucceeded();
});
