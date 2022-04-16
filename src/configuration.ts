import ServiceEnpointContracts = require("TFS/ServiceEndpoint/Contracts");
import WidgetHelpers = require("TFS/Dashboards/WidgetHelpers");
import { AdoService } from "./adoService";

// import TelemetryClient = require("scripts/TelemetryClient");

export class Configuration {
  private widgetConfigurationContext = null;
  private $subscriptionSelect = $("#subscription-dropdown");
  private $migrationProjectSelect = $("#migrate-project-dropdown");
  private $resourceGroupSelect = $("#rg-dropdown");
  private $chartTypeSelect = $("#chart-type-dropdown");

  private adoService: AdoService;
  private webContext: WebContext;

  constructor(public widgetHelpers: typeof WidgetHelpers) {
    this.adoService = new AdoService();
    this.webContext = VSS.getWebContext();
  }

  public load(widgetSettings, widgetConfigurationContext) {
    this.widgetConfigurationContext = widgetConfigurationContext;
    let settings: ISettings;
    settings = JSON.parse(widgetSettings.customSettings.data);
    // Show Chart options
    this.showChartType(settings);
    // First get the Azure Subscriptions using the Azure DevOps REST API
    this.adoService
      .GetAzureSubscriptions(this.webContext.project.name)
      .then((subscriptions) => {
        //Show the Subscriptions
        this.showAzureSubscriptions(subscriptions, settings);

        //If Resource group is already Saved show the saved value
        if (settings && settings.resourceGroupName) {
          const endpoint = subscriptions.filter(
            (sub) => sub.data.subscriptionId === settings.azureSubscriptionId
          );
          this.adoService
            .GetResourceGroups(this.webContext.project.name, endpoint[0])
            .then((resourceGroups) =>
              this.showResourceGroups(settings, resourceGroups)
            );
        }

        //If Migration project is already Saved show the saved value
        if (
          settings &&
          settings.resourceGroupName &&
          settings.migrateProjectName
        ) {
          const endpoint = subscriptions.filter(
            (sub) => sub.data.subscriptionId === settings.azureSubscriptionId
          );
          this.adoService
            .GetMigrateProjects(
              this.webContext.project.name,
              settings.resourceGroupName,
              endpoint[0]
            )
            .then((projects) => this.showMigrateProjects(settings, projects));
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
            this.adoService
              .GetResourceGroups(this.webContext.project.name, endpoint[0])
              .then((resourceGroups) =>
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
            this.adoService
              .GetMigrateProjects(
                this.webContext.project.name,
                rgName,
                endpoint[0]
              )
              .then((projects) => this.showMigrateProjects(settings, projects));
          }
        });

        VSS.resize();

        // Only when Migrate project or chart type is changed refresh the widget
        this.$migrationProjectSelect.add(this.$chartTypeSelect).on("change", () => {
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

  private showChartType(settings: ISettings){
    if (settings && settings.chartType) {
      this.$chartTypeSelect.val(settings.chartType);
    } else {
      this.$chartTypeSelect.val();
    }
  }

  private getCustomSettings() {
    const result = {
      data: JSON.stringify({
        azureSubscriptionId: this.$subscriptionSelect.val(),
        migrateProjectName: this.$migrationProjectSelect.val(),
        resourceGroupName: this.$resourceGroupSelect.val(),
        chartType: this.$chartTypeSelect.val()
      } as ISettings),
    };
    return result;
  }
}

VSS.require(["TFS/Dashboards/WidgetHelpers"], (WidgetHelpers) => {
  VSS.register("AzureMigrateWidget.Configuration", () => {
    const configuration = new Configuration(WidgetHelpers);
    return configuration;
  });

  VSS.notifyLoadSucceeded();
});
