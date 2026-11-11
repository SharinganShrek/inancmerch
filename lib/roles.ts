export const ROLES = [
  { id: "ogrenci", label: "Öğrenci", nameLabel: "İsim Soyisim" },
  { id: "veli", label: "Veli", nameLabel: "Öğrenci İsim-Soyisim" },
  { id: "mezun", label: "Mezun", nameLabel: "İsim Soyisim" },
  { id: "ogretmen", label: "Öğretmen", nameLabel: "İsim Soyisim" },
] as const;

export type RoleId = (typeof ROLES)[number]["id"];

export function isRole(value: string): value is RoleId {
  return ROLES.some((role) => role.id === value);
}

export function roleLabel(id: string) {
  return ROLES.find((role) => role.id === id)?.label ?? id;
}

export function nameLabel(id: string) {
  return ROLES.find((role) => role.id === id)?.nameLabel ?? "İsim Soyisim";
}
