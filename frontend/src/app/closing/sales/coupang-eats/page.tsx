import SalesPlatformForm from "@/components/sales/sales-platform-form";
import { COUPANG_EATS_CONFIG } from "@/data/sales-platforms";

export default function CoupangEatsSalesPage() {
  return <SalesPlatformForm config={COUPANG_EATS_CONFIG} />;
}