import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class ExportService {

  exportToCSV(data: any[], fileName: string): void {
    const csvData = this.convertToCSV(data);
    const blob = new Blob([csvData], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = fileName + '_export_' + new Date().getTime() + '.csv';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url); // Clean up the URL object
  }

  private convertToCSV(data: any[]): string {
    const header = Object.keys(data[0]).join(',') + '\n';
    const rows = data.map(row => Object.values(row).join(',')).join('\n');
    return header + rows;
  }
} 