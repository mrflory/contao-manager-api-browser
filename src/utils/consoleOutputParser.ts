import { ConsoleOutput, ConsoleOutputLine, ErrorCategory } from '../types/errorTypes';

export class ConsoleOutputParser {
  static parse(rawOutput: string, operationType?: string): ConsoleOutput {
    const lines = rawOutput.split('\n').map(line => this.parseLine(line.trim(), operationType));

    const errorCount = lines.filter(line => line.type === 'error').length;
    const warningCount = lines.filter(line => line.type === 'warning').length;

    return {
      lines: lines.filter(line => line.content.length > 0),
      rawOutput,
      hasErrors: errorCount > 0,
      errorCount,
      warningCount
    };
  }

  private static parseLine(content: string, operationType?: string): ConsoleOutputLine {
    if (!content) {
      return { content: '', type: 'output' };
    }

    const type = this.determineLineType(content, operationType);

    return {
      content,
      type,
      timestamp: this.extractTimestamp(content)
    };
  }

  private static determineLineType(content: string, operationType?: string): ConsoleOutputLine['type'] {
    const lower = content.toLowerCase();

    if (operationType === 'composer') {
      return this.parseComposerLine(content, lower);
    }

    if (operationType === 'manager') {
      return this.parseManagerLine(content, lower);
    }

    return this.parseGenericLine(content, lower);
  }

  private static parseComposerLine(content: string, lower: string): ConsoleOutputLine['type'] {
    if (content.startsWith('> ') || content.startsWith('$ ')) {
      return 'command';
    }

    if (lower.includes('error') || lower.includes('fatal') || lower.includes('exception')) {
      return 'error';
    }

    if (lower.includes('warning') || lower.includes('deprecated')) {
      return 'warning';
    }

    if (lower.includes('installing') || lower.includes('updating') || lower.includes('removing')) {
      return 'info';
    }

    if (lower.includes('complete') || lower.includes('finished') || lower.includes('success')) {
      return 'success';
    }

    return 'output';
  }

  private static parseManagerLine(content: string, lower: string): ConsoleOutputLine['type'] {
    if (content.startsWith('[') && content.includes(']')) {
      return 'info';
    }

    if (lower.includes('error') || lower.includes('failed') || lower.includes('exception')) {
      return 'error';
    }

    if (lower.includes('warning') || lower.includes('notice')) {
      return 'warning';
    }

    if (lower.includes('success') || lower.includes('completed') || lower.includes('done')) {
      return 'success';
    }

    return 'output';
  }

  private static parseGenericLine(content: string, lower: string): ConsoleOutputLine['type'] {
    if (content.startsWith('$ ') || content.startsWith('> ')) {
      return 'command';
    }

    if (lower.includes('error') || lower.includes('fatal') || lower.includes('failed')) {
      return 'error';
    }

    if (lower.includes('warning') || lower.includes('warn')) {
      return 'warning';
    }

    if (lower.includes('success') || lower.includes('complete') || lower.includes('done')) {
      return 'success';
    }

    return 'output';
  }

  private static extractTimestamp(content: string): string | undefined {
    const timestampMatch = content.match(/^\[([^\]]+)\]/);
    return timestampMatch ? timestampMatch[1] : undefined;
  }

  static extractMainError(consoleOutput: ConsoleOutput): string | undefined {
    const errorLines = consoleOutput.lines.filter(line => line.type === 'error');

    if (errorLines.length === 0) {
      return undefined;
    }

    return errorLines
      .map(line => line.content)
      .join('\n')
      .replace(/^\[.*?\]\s*/, '')
      .trim();
  }
}

export class ErrorCategorizer {
  static categorizeFromOutput(rawOutput: string, operationType?: string): ErrorCategory {
    const lower = rawOutput.toLowerCase();

    if (lower.includes('connection') || lower.includes('network') || lower.includes('timeout')) {
      return 'network';
    }

    if (lower.includes('authentication') || lower.includes('unauthorized') || lower.includes('token')) {
      return 'authentication';
    }

    if (operationType === 'composer' || lower.includes('composer') || lower.includes('dependency')) {
      return 'composer';
    }

    if (lower.includes('migration') || lower.includes('database')) {
      return 'migration';
    }

    if (lower.includes('manager') || lower.includes('contao manager')) {
      return 'manager';
    }

    if (lower.includes('validation') || lower.includes('invalid')) {
      return 'validation';
    }

    if (lower.includes('system') || lower.includes('memory') || lower.includes('disk')) {
      return 'system';
    }

    return 'unknown';
  }

  static getSeverityFromCategory(category: ErrorCategory): 'low' | 'medium' | 'high' | 'critical' {
    switch (category) {
      case 'authentication':
      case 'system':
        return 'critical';
      case 'composer':
      case 'migration':
        return 'high';
      case 'network':
      case 'manager':
        return 'medium';
      case 'validation':
        return 'low';
      default:
        return 'medium';
    }
  }
}