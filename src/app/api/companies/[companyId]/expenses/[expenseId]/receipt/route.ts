import { getCompanyContext } from "@/server/auth/dal";
import { readReceipt } from "@/server/files";
import { getExpense } from "@/server/queries/expense.queries";

export async function GET(_request: Request, { params }: RouteContext<"/api/companies/[companyId]/expenses/[expenseId]/receipt">) {
  const { companyId, expenseId } = await params;
  const ctx = await getCompanyContext(companyId);
  if (!ctx) return new Response("Introuvable", { status: 404 });

  // getExpense applies the visibility rule (employees: own requests only).
  const expense = await getExpense(ctx, expenseId);
  if (!expense?.receiptPath) return new Response("Introuvable", { status: 404 });

  try {
    const file = await readReceipt(expense.receiptPath);
    return new Response(new Uint8Array(file), {
      headers: {
        "Content-Type": expense.receiptMime ?? "application/octet-stream",
        "Content-Disposition": `inline; filename="${encodeURIComponent(expense.receiptName ?? "justificatif")}"`,
        "X-Content-Type-Options": "nosniff",
        "Cache-Control": "private, no-store",
      },
    });
  } catch {
    return new Response("Fichier introuvable", { status: 404 });
  }
}
