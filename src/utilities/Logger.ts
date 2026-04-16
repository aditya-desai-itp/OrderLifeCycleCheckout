class DiagnosticLogger {
  private logs: Array<{ timestamp: string; level: string; event: string; data: any }> = [];

  private sanitize(data: any) {
    if (!data) return data;
    const sanitized = { ...data };
    // Strip Personally Identifiable Information (PII) before logging
    if (sanitized.checkoutDetails) {
      sanitized.checkoutDetails = '[REDACTED_PII]';
    }
    if (sanitized.email || sanitized.name) {
      sanitized.email = '[REDACTED]';
      sanitized.name = '[REDACTED]';
    }
    return sanitized;
  }

  log(level: 'INFO' | 'WARN' | 'ERROR' | 'SEC_AUDIT', event: string, data?: any) {
    const entry = { timestamp: new Date().toISOString(), level, event, data: this.sanitize(data) };
    this.logs.push(entry);
    console.log(`[${level}] ${event}`, entry.data || '');
  }

  exportLogs() {
    return JSON.stringify(this.logs, null, 2);
  }

  clear() {
    this.logs = [];
    this.log('INFO', 'Diagnostic logs cleared manually.');
  }
}

export const Logger = new DiagnosticLogger();