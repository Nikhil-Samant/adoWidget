import Contracts = require("Charts/Contracts");
import Service = require("Charts/Services");
import WidgetHelpers = require("TFS/Dashboards/WidgetHelpers");
import { AdoService } from "./adoService";

export class SummaryWiget {
  private currentSettings: ISettings;
  private adoService: AdoService = new AdoService();
  private webContext: WebContext;

  constructor(public widgetHelpers: typeof WidgetHelpers) {}

  public load(widgetSettings) {
    this.webContext = VSS.getWebContext();
    return this.showReplicationStatus(widgetSettings);
  }

  public reload(widgetSettings) {
    this.webContext = VSS.getWebContext();
    return this.showReplicationStatus(widgetSettings);
  }

  private showReplicationStatus(widgetSettings) {
    try {
      this.parseSettings(widgetSettings);
      if (
        this.currentSettings.resourceGroupName &&
        this.currentSettings.migrateProjectName
      ) {
        // Remove the unconfigured message
        $("#unconfigured").remove();

        this.adoService
          .GetAzureSubscriptions(this.webContext.project.name)
          .then((subscriptions) => {
            const endpoint = subscriptions.filter(
              (sub) =>
                sub.data.subscriptionId ===
                this.currentSettings.azureSubscriptionId
            );
            this.adoService
              .GetMigrateProject(
                this.webContext.project.name,
                this.currentSettings.resourceGroupName,
                this.currentSettings.migrateProjectName,
                endpoint[0]
              )
              .then((result) => {
                const data = JSON.parse(result);
                if (data) {
                  this.renderWidget(data, this.currentSettings.chartType);
                } else {
                  this.widgetHelpers.WidgetStatusHelper.Unconfigured();
                }
              });
          });
        return this.widgetHelpers.WidgetStatusHelper.Success();
      } else {
        return this.widgetHelpers.WidgetStatusHelper.Unconfigured();
      }
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
        colSpan: 3,
        rowSpan: 2,
        chartType: "bar",
      };
    }

    this.currentSettings.name = widgetSettings.name;
    this.currentSettings.rowSpan = widgetSettings.size.rowSpan;
    this.currentSettings.colSpan = widgetSettings.size.columnSpan;
  }

  private renderWidget(data, chartType: string) {
    const $title = $("h2.widget-title");
    const $subtitle = $("h4.subtitle");
    const $container = $("#Chart-Container");
    $container.empty();

    $title.text(this.currentSettings.name);
    $subtitle.text(this.currentSettings.migrateProjectName);

    const overallStatus = [
      data.properties.summary.servers.discoveredCount,
      data.properties.summary.servers.assessedCount,
      data.properties.summary.servers.replicatingCount,
      data.properties.summary.servers.testMigratedCount,
      data.properties.summary.servers.migratedCount,
    ];

    const chartService = this.buildChartService();
    const widgetHeight = Math.round(
      this.widgetHelpers.WidgetSizeConverter.RowsToPixelHeight(
        this.currentSettings.rowSpan
      ) * 0.78
    );
    const widgetWidth = Math.round(
      this.widgetHelpers.WidgetSizeConverter.ColumnsToPixelWidth(
        this.currentSettings.colSpan
      ) * 0.9
    );
    const chartOptions: Contracts.CommonChartOptions = {
      hostOptions: {
        height: widgetHeight,
        width: widgetWidth,
      },
      chartType: this.GetChartType(chartType),
      series: [
        {
          name: "Servers",
          data: overallStatus,
        },
      ],
      xAxis: {
        labelValues: [
          "Discovered",
          "Assessed",
          "Replicating",
          "Test Migrated",
          "Migrated",
        ],
      },
      yAxis: {
        title: "Machines",
      },
    };

    chartService.then((service) => {
      service.createChart($container, chartOptions);
    });
  }

  private GetChartType(chartType: string): string {
    switch (chartType) {
      case "bar":
        return Contracts.ChartTypesConstants.Bar;
      case "stackedbar":
        return Contracts.ChartTypesConstants.StackedBar;
      case "column":
        return Contracts.ChartTypesConstants.Column;
      case "stackedcolumn":
        return Contracts.ChartTypesConstants.StackedColumn;
      case "pie":
        return Contracts.ChartTypesConstants.Pie;
      default:
        return Contracts.ChartTypesConstants.Bar;
    }
  }
  private buildChartService(): IPromise<Service.IChartsService> {
    const chartService = Service.ChartsService.getService();
    return chartService;
  }
}

VSS.require(["TFS/Dashboards/WidgetHelpers"], (WidgetHelpers) => {
  WidgetHelpers.IncludeWidgetStyles();
  VSS.register("AzureMigrateSummaryWidget", () => {
    const summaryWiget = new SummaryWiget(WidgetHelpers);
    return summaryWiget;
  });
  VSS.notifyLoadSucceeded();
});
