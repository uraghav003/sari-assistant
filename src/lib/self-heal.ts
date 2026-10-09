import { audit } from "./storage";
import { recordLesson } from "./skills-engine";

export type FailureReason =
  | "AUTH_EXPIRED"
  | "RATE_LIMITED"
  | "ENDPOINT_UNREACHABLE"
  | "TIMEOUT"
  | "MALFORMED_RESPONSE"
  | "UNKNOWN";

export interface HealReport {
  action: string;
  recovered: boolean;
  reason: FailureReason;
  diagnosis: string;
  fallbackUsed?: string;
}

export function diagnoseError(error: unknown, status?: number): { reason: FailureReason; diagnosis: string } {
  const msg = error instanceof Error ? error.message.toLowerCase() : String(error).toLowerCase();

  if (status === 401 || status === 403 || msg.includes("api key") || msg.includes("auth") || msg.includes("unauthorized")) {
    return {
      reason: "AUTH_EXPIRED",
      diagnosis: `Authentication rejected (${status || "Key Invalid"}). Directing to Connections for key renewal.`,
    };
  }

  if (status === 429 || msg.includes("quota") || msg.includes("rate limit") || msg.includes("resource_exhausted")) {
    return {
      reason: "RATE_LIMITED",
      diagnosis: `Upstream quota exceeded (HTTP 429). Self-healing failover to local runtime activated.`,
    };
  }

  if (status === 404 || status === 502 || status === 503 || msg.includes("failed to fetch") || msg.includes("network")) {
    return {
      reason: "ENDPOINT_UNREACHABLE",
      diagnosis: `Edge/Serverless endpoint unreachable (${status || "Offline"}). Switching to direct provider routing.`,
    };
  }

  if (msg.includes("abort") || msg.includes("timeout") || msg.includes("timed out")) {
    return {
      reason: "TIMEOUT",
      diagnosis: `Inference response deadline reached. Self-healing to faster local or fallback brain.`,
    };
  }

  if (msg.includes("json") || msg.includes("syntax") || msg.includes("unexpected token")) {
    return {
      reason: "MALFORMED_RESPONSE",
      diagnosis: `Payload parsing anomaly. Sanitizing response structure.`,
    };
  }

  return {
    reason: "UNKNOWN",
    diagnosis: `Runtime anomaly: ${error instanceof Error ? error.message : String(error)}`,
  };
}

export async function withSelfHeal<T>(
  actionName: string,
  primaryFn: () => Promise<T>,
  fallbackFn: (report: HealReport) => Promise<T>
): Promise<T> {
  try {
    return await primaryFn();
  } catch (error: unknown) {
    const { reason, diagnosis } = diagnoseError(error);
    const healReport: HealReport = {
      action: actionName,
      recovered: false,
      reason,
      diagnosis,
    };

    audit("self_heal", "triggered", `${actionName}: ${diagnosis}`);
    recordLesson(`Self-Heal [${actionName}]: ${diagnosis}`);

    try {
      const recoveredResult = await fallbackFn(healReport);
      healReport.recovered = true;
      audit("self_heal", "recovered", `${actionName} recovered successfully via fallback.`);
      return recoveredResult;
    } catch (fallbackError: unknown) {
      const finalDiagnosis = fallbackError instanceof Error ? fallbackError.message : String(fallbackError);
      audit("self_heal", "failed", `${actionName} fallback failed: ${finalDiagnosis}`);
      throw fallbackError;
    }
  }
}
