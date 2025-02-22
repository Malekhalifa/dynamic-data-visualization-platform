import { Component } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClientModule } from '@angular/common/http';
import { Chart, ChartConfiguration } from 'chart.js';
import { BaseChartDirective } from 'ng2-charts';
import { provideCharts, withDefaultRegisterables } from 'ng2-charts'; // Add this import
import zoomPlugin from 'chartjs-plugin-zoom';
import { ExportService } from '../services/export.service';
@Component({
  selector: 'app-home',
  standalone: true,
  imports: [CommonModule, FormsModule, HttpClientModule, BaseChartDirective],
  templateUrl: './home.component.html',
  styleUrls: ['./home.component.css'],
  providers: [
    ExportService,
    provideCharts(withDefaultRegisterables()), // Add this line
  ],
})
export class HomeComponent {
  query: string = '';
  tableData: any[] = [];
  chartData: any;
  URL: string = 'http://localhost/backend/api.php';
  selectedXColumn: string = '';
  selectedYColumn: string = '';
  selectedChartType: 'bar' | 'line' | 'pie' = 'bar';
  columns: string[] = [];
  chartTypes: string[] = ['bar', 'line', 'pie'];
  chartMessage: string = '';
  filterColumn: string = '';
  filterValue: string = '';
  queryHistory: { query: string, isFavorite: boolean }[] = [];
  favoriteQueries: { query: string }[] = [];


  queryTemplates: { name: string, query: string }[] = [
    { name: 'Select All', query: 'SELECT * FROM mytable' },
    { name: 'Count Records', query: 'SELECT COUNT(*) FROM mytable' },
    { name: 'Group by wellnessCentreName', query: 'SELECT wellnessCentreName, COUNT(*) FROM mytable GROUP BY wellnessCentreName' },
    { name: 'Top 10 Records', query: 'SELECT * FROM mytable LIMIT 10' },
    { name: 'Average Record by City', query: 'SELECT cityName, AVG(record) FROM mytable GROUP BY cityName' },
    { name: 'Records with Specific Card Type', query: 'SELECT cityName, wellnessCentreName, record FROM mytable WHERE card_type = \'Freedom Fighter\'' },
    // Add more templates as needed
  ];

  constructor(private http: HttpClient, private exportService: ExportService) {
    Chart.register(zoomPlugin);
  }
  public barChartOptions: ChartConfiguration<'bar' | 'line' | 'pie'>['options'] = {
    responsive: true,
    plugins: {
      zoom: {
        zoom: {
          wheel: {
            enabled: true,
          },
          pinch: {
            enabled: true
          },
          mode: 'xy',
        },
        pan: {
          enabled: true,
          mode: 'xy',
        }
      }
    },

  };

  public barChartData: ChartConfiguration<'bar' | 'line' | 'pie'>['data'] = {
    labels: [], // X-axis labels
    datasets: [
      {
        data: [], // Y-axis data
        label: 'Data', // Legend label
        backgroundColor: 'rgba(33, 150, 243, 0.5)', // Bar color
        borderColor: 'rgba(33, 150, 243, 1)', // Border color
        borderWidth: 1, // Border width
        fill: this.selectedChartType === 'line' ? false : undefined,
      },
    ],
  };





  appendToQuery(text: string) {
    const sqlKeywords = ['SELECT', 'FROM', 'WHERE', 'ORDER BY', 'LIMIT', 'GROUP BY'];
    const hasOrderBy = this.query.toUpperCase().includes('ORDER BY');
    const hasGroupBy = this.query.toUpperCase().includes('GROUP BY');

    if (sqlKeywords.includes(text.toUpperCase())) {
      if (text.toUpperCase() === 'FROM' || hasOrderBy || hasGroupBy) {
        this.query = this.query.replace(/,\s*$/, '');
      }
      this.query += ' ' + text + ' ';
    } else if (text.toLowerCase() === 'mytable' || hasOrderBy || hasGroupBy) {
      this.query += text;
    } else {
      this.query += text + ', ';
    }
  }

  DeleteQuery() {
    this.hideTable();
    this.query = '';
    this.chartData = null;
    this.chartMessage = '';
    this.selectedChartType = 'bar'; // Resetting the selected chart type
    this.filterColumn = ''; // Resetting the filter column
    this.filterValue = ''; // Resetting the filter value
    this.selectedXColumn = ''; // Resetting the selected X column
    this.selectedYColumn = '';
  }

  showTable() {
    this.saveQueryToHistory();
    const payload = { query: this.query };
    this.http.post(this.URL, payload).subscribe({
      next: (data: any) => {
        this.tableData = data;
        this.chartData = null;
        if (data.length > 0) {
          this.columns = Object.keys(data[0]);
        }
      },
      error: (err) => {
        console.error('API Error:', err);
        alert('Error: SQL Query is Required / Not Valid !');
      }
    });
  }

  hideTable() {
    this.tableData = [];
  }



  updateChart(data: any[]) {
    const columns = Object.keys(data[0]);

    if (columns.length !== 2) {
      this.chartMessage = 'The data does not meet the required format for charting. Please ensure the query returns exactly two columns.';
      this.barChartData = { labels: [], datasets: [] };
      return;
    }

    this.chartMessage = '';

    const labels = data.map(row => row[this.selectedXColumn]);
    const values = data.map(row => row[this.selectedYColumn]);

    if (this.selectedChartType === 'pie') {
      const colors = Array.from({ length: values.length }, () =>
        `hsl(${Math.random() * 360}, 70%, 50%)`
      );

      this.barChartData = {
        labels: labels,
        datasets: [{
          data: values,
          backgroundColor: colors,
          borderColor: '#ffffff',
          borderWidth: 2,
        }]
      };

      this.barChartOptions = {
        plugins: {
          legend: { display: false },
          tooltip: { enabled: true }
        }
      } as any;
    } else {
      this.barChartOptions = {
        responsive: true,
        plugins: {
          zoom: {
            zoom: {
              wheel: { enabled: true },
              pinch: { enabled: true },
              mode: 'xy',
            },
            pan: {
              enabled: true,
              mode: 'xy',
            }
          }
        },
        scales: {
          x: { type: 'category', title: { display: true, text: 'Categories' } },
          y: { type: 'linear', title: { display: true, text: 'Values' } }
        }
      };

      this.barChartData = {
        labels: labels,
        datasets: [{
          data: values,
          label: this.selectedYColumn,
          backgroundColor: this.selectedChartType === 'line' ? 'rgba(33, 150, 243, 0.1)' : 'rgba(33, 150, 243, 0.5)',
          borderColor: 'rgba(33, 150, 243, 1)',
          borderWidth: 1,
          fill: this.selectedChartType === 'line' ? false : undefined,
        }]
      };
    }
  }

  getKeys(obj: any): string[] {
    return obj ? Object.keys(obj) : [];
  }

  exportData() {
    if (this.tableData.length === 0) {
      alert('No data available to export.');
      return;
    }
    this.exportService.exportToExcel(this.tableData, 'QueryResults');
  }

  saveQueryToHistory() {
    if (this.query && !this.queryHistory.some(q => q.query === this.query)) {
      this.queryHistory.push({ query: this.query, isFavorite: false });
    }
  }
  markAsFavorite(query: string) {
    const historyItem = this.queryHistory.find(q => q.query === query);
    if (historyItem) {
      historyItem.isFavorite = !historyItem.isFavorite;
      if (historyItem.isFavorite) {
        this.favoriteQueries.push({ query });
      } else {
        this.favoriteQueries = this.favoriteQueries.filter(q => q.query !== query);
      }
    }
  }
  applyQuery(query: string) {
    this.query = query;
  }

  applyTemplate(query: string | null) {
    if (query) {
      this.query = query;
    }
  }
  onTemplateChange(event: Event) {
    const selectElement = event.target as HTMLSelectElement;
    const query = selectElement.value;
    this.applyTemplate(query);
  }

  showChart() {
    this.saveQueryToHistory();
    const payload = { query: this.query };
    this.http.post(this.URL, payload).subscribe({
      next: (data: any) => {
        this.chartData = data;
        if (data.length > 0) {
          this.columns = Object.keys(data[0]);
          this.selectedXColumn = this.columns[0];
          this.selectedYColumn = this.columns[1];
        }
        this.updateChart(data);
      },
      error: (err) => {
        console.error('API Error:', err);
        alert('Error: SQL Query is Required / Not Valid !');
      },
    });
    this.hideTable();
  }

}