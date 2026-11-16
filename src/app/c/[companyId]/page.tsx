import { redirect } from "next/navigation";

export default async function CompanyHome({ params }: PageProps<"/c/[companyId]">) {
  const { companyId } = await params;
  redirect(`/c/${companyId}/dashboard`);
}
