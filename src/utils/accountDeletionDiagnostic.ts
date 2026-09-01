const ACCOUNT_DELETION_DIAGNOSTIC_KEY = 'inumis_account_deletion_diagnostic';

type AccountDeletionDiagnosticStatus = 'CLICK' | 'ENTER' | 'BEFORE' | 'AFTER' | 'ERROR';

interface AccountDeletionDiagnosticEntry {
  timestamp: string;
  stage: string;
  status: AccountDeletionDiagnosticStatus;
  code?: string;
  message?: string;
}

export function clearAccountDeletionDiagnostic(): void {
  try {
    localStorage.removeItem(ACCOUNT_DELETION_DIAGNOSTIC_KEY);
  } catch {
    // Diagnostics must never affect account deletion.
  }
}

export function persistAccountDeletionDiagnostic(
  stage: string,
  status: AccountDeletionDiagnosticStatus,
  error?: unknown,
): void {
  try {
    const storedEntries = localStorage.getItem(ACCOUNT_DELETION_DIAGNOSTIC_KEY);
    const parsedEntries: unknown = storedEntries ? JSON.parse(storedEntries) : [];
    const entries: AccountDeletionDiagnosticEntry[] = Array.isArray(parsedEntries) ? parsedEntries : [];
    const entry: AccountDeletionDiagnosticEntry = {
      timestamp: new Date().toISOString(),
      stage,
      status,
    };

    if (status === 'ERROR') {
      const diagnosticError = error as { code?: unknown; message?: unknown };
      entry.code = typeof diagnosticError?.code === 'string' ? diagnosticError.code : 'unknown';
      entry.message = typeof diagnosticError?.message === 'string' ? diagnosticError.message : String(error);
    }

    entries.push(entry);
    localStorage.setItem(ACCOUNT_DELETION_DIAGNOSTIC_KEY, JSON.stringify(entries));
  } catch {
    // Diagnostics must never affect account deletion.
  }
}
