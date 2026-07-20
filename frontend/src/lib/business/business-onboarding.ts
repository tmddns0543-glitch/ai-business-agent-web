export type BusinessOnboardingInput = {
  name: string;
  industry: string;
  registrationNumber: string | null;
  ownerName: string | null;
  region: string | null;
};

function normalizeText(value: string) {
  return value.trim().replace(/\s+/g, " ");
}

export function normalizeBusinessRegistrationNumber(value: string) {
  return value.replace(/\D/g, "");
}

export function validateBusinessOnboarding(raw: {
  name: string;
  industry: string;
  registrationNumber: string;
  ownerName: string;
  region: string;
}): { ok: true; data: BusinessOnboardingInput } | { ok: false; message: string } {
  const name = normalizeText(raw.name);
  const industry = normalizeText(raw.industry);
  const registrationNumber = normalizeBusinessRegistrationNumber(raw.registrationNumber);
  const ownerName = normalizeText(raw.ownerName);
  const region = normalizeText(raw.region);

  if (!name || name.length > 80) return { ok: false, message: "사업장명은 1자 이상 80자 이하로 입력해 주세요." };
  if (!industry || industry.length > 80) return { ok: false, message: "업종은 1자 이상 80자 이하로 입력해 주세요." };
  if (raw.registrationNumber.trim() && (!/^[0-9\s-]+$/.test(raw.registrationNumber) || registrationNumber.length !== 10)) return { ok: false, message: "사업자등록번호는 숫자 10자리로 입력해 주세요." };
  if (ownerName.length > 80 || region.length > 80) return { ok: false, message: "대표자명과 지역은 80자 이하로 입력해 주세요." };

  return {
    ok: true,
    data: {
      name,
      industry,
      registrationNumber: registrationNumber || null,
      ownerName: ownerName || null,
      region: region || null,
    },
  };
}
