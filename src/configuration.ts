import Q = require("q");
import ServiceEnpointClient = require("TFS/ServiceEndpoint/ServiceEndpointRestClient");
import ServiceEnpointContracts = require("TFS/ServiceEndpoint/Contracts");
import WidgetHelpers = require("TFS/Dashboards/WidgetHelpers");

// import TelemetryClient = require("scripts/TelemetryClient");

export class Configuration {
  private widgetConfigurationContext = null;
  private $subscriptionSelect = $("#subscription-dropdown");
  private $migrationProjectSelect = $("#migrate-project-dropdown");
  private $resourceGroupSelect = $("#rg-dropdown");

  constructor(public widgetHelpers: typeof WidgetHelpers) {}

  public load(widgetSettings, widgetConfigurationContext) {
    this.widgetConfigurationContext = widgetConfigurationContext;
    let settings: ISettings;
    settings = JSON.parse(widgetSettings.customSettings.data);

    // First get the Azure Subscriptions using the Azure DevOps REST API
    this.getAzureSubscriptions().then((subscriptions) => {
      //Show the Subscriptions
      this.showAzureSubscriptions(subscriptions, settings);

      //If Resource group is already Saved show the saved value
      if (settings && settings.resourceGroupName) {
        const endpoint = subscriptions.filter(
          (sub) => sub.data.subscriptionId === settings.azureSubscriptionId
        );
        this.getResourceGroups(endpoint[0]).then((resourceGroups) =>
          this.showResourceGroups(settings, resourceGroups)
        );
      }

      //If Migration project is already Saved show the saved value
      if (settings && settings.resourceGroupName && settings.migrateProjectName) {
        const endpoint = subscriptions.filter(
          (sub) => sub.data.subscriptionId === settings.azureSubscriptionId
        );
        this.getMigrateProjects(settings.resourceGroupName, endpoint[0]).then((projects) =>
            this.showMigrateProjects(settings, projects)
          );
      }

      //IF subscription is changed the resource group and migrate project will change
      this.$subscriptionSelect.on("change", () => {
        const azureSubscriptionId: string = this.$subscriptionSelect
          .val()
          .toString();

        if (azureSubscriptionId) {
          const endpoint = subscriptions.filter(
            (sub) => sub.data.subscriptionId === azureSubscriptionId
          );
          this.getResourceGroups(endpoint[0]).then((resourceGroups) =>
            this.showResourceGroups(settings, resourceGroups)
          );
        }
      });

      // If resource group is changed the migrate project will change
      this.$resourceGroupSelect.on("change", () => {
        const azureSubscriptionId: string = this.$subscriptionSelect
          .val()
          .toString();
        const rgName: string = this.$resourceGroupSelect.val().toString();

        if (rgName && azureSubscriptionId) {
          const endpoint = subscriptions.filter(
            (sub) => sub.data.subscriptionId === azureSubscriptionId
          );
          this.getMigrateProjects(rgName, endpoint[0]).then((projects) =>
            this.showMigrateProjects(settings, projects)
          );
        }
      });

      VSS.resize();

      // Only when Migrate project is changed refresh the widget
      this.$migrationProjectSelect.on("change", () => {
        this.widgetConfigurationContext.notify(
          this.widgetHelpers.WidgetEvent.ConfigurationChange,
          this.widgetHelpers.WidgetEvent.Args(this.getCustomSettings())
        );
      });
    });

    return this.widgetHelpers.WidgetStatusHelper.Success();
  }

  public onSave() {
    const isValid = true;
    if (isValid) {
      // TelemetryClient.TelemetryClient.getClient().trackEvent("Updated configuration");
      return this.widgetHelpers.WidgetConfigurationSave.Valid(
        this.getCustomSettings()
      );
    } else {
      return this.widgetHelpers.WidgetConfigurationSave.Invalid();
    }
  }

  private showAzureSubscriptions(
    subscriptions: ServiceEnpointContracts.ServiceEndpoint[],
    settings: ISettings
  ) {
    for (const subscription of subscriptions) {
      const opt = document.createElement("option");
      opt.innerHTML = subscription.data.subscriptionName;
      opt.value = subscription.data.subscriptionId;
      this.$subscriptionSelect[0].appendChild(opt);
    }

    if (settings && settings.azureSubscriptionId) {
      this.$subscriptionSelect.val(settings.azureSubscriptionId);
    } else {
      this.$subscriptionSelect.val();
    }
  }

  private showResourceGroups(settings: ISettings, resourceGroups: string[]) {
    for (const rg of resourceGroups) {
      const opt = document.createElement("option");
      opt.innerHTML = rg;
      opt.value = rg;
      this.$resourceGroupSelect[0].appendChild(opt);
    }

    if (settings && settings.resourceGroupName) {
      this.$resourceGroupSelect.val(settings.resourceGroupName);
    } else {
      this.$resourceGroupSelect.val();
    }
  }

  private showMigrateProjects(settings: ISettings, projects: string[]) {
    const rgName = this.$resourceGroupSelect.val();
    for (const project of projects) {
      const opt = document.createElement("option");
      opt.innerHTML = project;
      opt.value = project;
      this.$migrationProjectSelect[0].appendChild(opt);
    }

    if (settings && settings.migrateProjectName) {
      this.$migrationProjectSelect.val(settings.migrateProjectName);
    } else {
      this.$migrationProjectSelect.val();
    }
  }

  private getCustomSettings() {
    const result = {
      data: JSON.stringify({
        azureSubscriptionId: this.$subscriptionSelect.val(),
        migrateProjectName: this.$migrationProjectSelect.val(),
        resourceGroupName: this.$resourceGroupSelect.val(),
      } as ISettings),
    };
    return result;
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

  private getResourceGroups(
    endpoint: ServiceEnpointContracts.ServiceEndpoint
  ): Q.Promise<string[]> {
    const deferred = Q.defer<string[]>();
    const webContext = VSS.getWebContext();
    const dataSourceDetails: ServiceEnpointContracts.DataSourceDetails = {
      dataSourceName: "AzureResourceGroups",
      dataSourceUrl: "",
      headers: [],
      initialContextTemplate: "",
      parameters: {},
      requestContent: "",
      requestVerb: "",
      resourceUrl: "",
      resultSelector: "jsonpath:$.value[*].id",
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
        if (result.result) {
          deferred.resolve(result.result);
        } else {
          deferred.resolve(null);
        }
      });
    return deferred.promise;
  }

  private getMigrateProjects(
    resourceGroupName: string,
    endpoint: ServiceEnpointContracts.ServiceEndpoint
  ): Q.Promise<string[]> {
    const deferred = Q.defer<string[]>();
    const webContext = VSS.getWebContext();
    const dataSourceDetails: ServiceEnpointContracts.DataSourceDetails = {
      dataSourceName: "",
      dataSourceUrl:
        "{{{endpoint.url}}}subscriptions/{{{endpoint.subscriptionId}}}/resourceGroups/" +
        resourceGroupName +
        "/providers/Microsoft.Migrate/migrateProjects?api-version=2018-09-01-preview",
      headers: [],
      initialContextTemplate: "",
      parameters: {},
      requestContent: "",
      requestVerb: "",
      resourceUrl: "",
      resultSelector: "jsonpath:$.value[*].name",
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
  VSS.register("AzureMigrateWidget.Configuration", () => {
    const configuration = new Configuration(WidgetHelpers);
    return configuration;
  });

  VSS.notifyLoadSucceeded();
});
