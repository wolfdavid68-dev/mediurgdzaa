export const INCOMPATIBILITIES = [
  {
    drug: "Adrénaline®",
    short: "Adrén.",
    color: "#f43f5e",
    items: [],
    compatibleWith: [],
  },
  {
    drug: "Dobutamine®",
    short: "Dobut.",
    color: "#0ea5e9",
    items: [],
    compatibleWith: [
      "Adrénaline®"
    ],
  },
  {
    drug: "Norépinéphrine (Noradrénaline®)",
    short: "Norép.",
    color: "#ef4444",
    items: [],
    compatibleWith: [
      "Adrénaline®", "Dobutamine®"
    ],
  },
  {
    drug: "Amiodarone (Cordarone®)",
    short: "Amiod.",
    color: "#f97316",
    items: [],
    compatibleWith: [
      "Adrénaline®", "Dobutamine®", "Norépinéphrine (Noradrénaline®)"
    ],
  },
  {
    drug: "Isoprénaline (Isuprel®)",
    short: "Isopr.",
    color: "#ec4899",
    items: [],
    compatibleWith: [
      "Adrénaline®", "Dobutamine®", "Norépinéphrine (Noradrénaline®)", "Amiodarone (Cordarone®)"
    ],
  },
  {
    drug: "Landiolol (Rapibloc®)",
    short: "Landi.",
    color: "#06b6d4",
    items: [],
    compatibleWith: [],
  },
  {
    drug: "Lidocaïne®",
    short: "Lidoc.",
    color: "#6366f1",
    items: [],
    compatibleWith: [
      "Adrénaline®", "Dobutamine®", "Norépinéphrine (Noradrénaline®)", "Amiodarone (Cordarone®)",
      "Isoprénaline (Isuprel®)"
    ],
  },
  {
    drug: "Milrinone (Corotrope®)",
    short: "Milri.",
    color: "#8b5cf6",
    items: [],
    compatibleWith: [
      "Adrénaline®", "Dobutamine®", "Norépinéphrine (Noradrénaline®)", "Amiodarone (Cordarone®)",
      "Isoprénaline (Isuprel®)", "Lidocaïne®"
    ],
  },
  {
    drug: "Clonidine (Catapressan®)",
    short: "Cloni.",
    color: "#14b8a6",
    items: [
      { with: "Amiodarone (Cordarone®)", type: "incompatible", note: "" },
    ],
    compatibleWith: [
      "Adrénaline®", "Dobutamine®", "Norépinéphrine (Noradrénaline®)", "Isoprénaline (Isuprel®)",
      "Milrinone (Corotrope®)"
    ],
  },
  {
    drug: "Isosorbide (Risordan®)",
    short: "Isoso.",
    color: "#22c55e",
    items: [],
    compatibleWith: [
      "Lidocaïne®"
    ],
  },
  {
    drug: "Labetalol (Trandate®)",
    short: "Labet.",
    color: "#84cc16",
    items: [],
    compatibleWith: [
      "Adrénaline®", "Dobutamine®", "Norépinéphrine (Noradrénaline®)", "Amiodarone (Cordarone®)",
      "Lidocaïne®", "Milrinone (Corotrope®)", "Clonidine (Catapressan®)"
    ],
  },
  {
    drug: "Nicardipine (Loxen®)",
    short: "Nicar.",
    color: "#f59e0b",
    items: [],
    compatibleWith: [
      "Adrénaline®", "Dobutamine®", "Norépinéphrine (Noradrénaline®)", "Amiodarone (Cordarone®)",
      "Lidocaïne®", "Milrinone (Corotrope®)", "Clonidine (Catapressan®)", "Labetalol (Trandate®)"
    ],
  },
  {
    drug: "Urapidil (Eupressyl®)",
    short: "Urapi.",
    color: "#d97706",
    items: [],
    compatibleWith: [
      "Amiodarone (Cordarone®)", "Landiolol (Rapibloc®)", "Clonidine (Catapressan®)",
      "Labetalol (Trandate®)"
    ],
  },
  {
    drug: "Bumétanide (Burinex®)",
    short: "Bumét.",
    color: "#a16207",
    items: [],
    compatibleWith: [
      "Amiodarone (Cordarone®)", "Isoprénaline (Isuprel®)"
    ],
  },
  {
    drug: "Furosémide (Lasilix®)",
    short: "Furos.",
    color: "#3b82f6",
    items: [
      { with: "Dobutamine®", type: "incompatible", note: "" },
      { with: "Amiodarone (Cordarone®)", type: "incompatible", note: "" },
      { with: "Milrinone (Corotrope®)", type: "incompatible", note: "" },
      { with: "Labetalol (Trandate®)", type: "incompatible", note: "" },
      { with: "Nicardipine (Loxen®)", type: "incompatible", note: "" },
      { with: "Urapidil (Eupressyl®)", type: "incompatible", note: "" },
    ],
    compatibleWith: [
      "Norépinéphrine (Noradrénaline®)", "Isoprénaline (Isuprel®)", "Lidocaïne®",
      "Clonidine (Catapressan®)", "Isosorbide (Risordan®)", "Bumétanide (Burinex®)"
    ],
  },
  {
    drug: "Dexmédétomidine (Dexdor®)",
    short: "Dexmé.",
    color: "#38bdf8",
    items: [],
    compatibleWith: [
      "Adrénaline®", "Dobutamine®", "Norépinéphrine (Noradrénaline®)", "Amiodarone (Cordarone®)",
      "Isoprénaline (Isuprel®)", "Lidocaïne®", "Milrinone (Corotrope®)", "Clonidine (Catapressan®)",
      "Labetalol (Trandate®)", "Nicardipine (Loxen®)", "Bumétanide (Burinex®)", "Furosémide (Lasilix®)"
    ],
  },
  {
    drug: "Midazolam (Hypnovel®)",
    short: "Midaz.",
    color: "#7c3aed",
    items: [
      { with: "Bumétanide (Burinex®)", type: "incompatible", note: "" },
      { with: "Furosémide (Lasilix®)", type: "incompatible", note: "" },
    ],
    compatibleWith: [
      "Adrénaline®", "Dobutamine®", "Norépinéphrine (Noradrénaline®)", "Amiodarone (Cordarone®)",
      "Isoprénaline (Isuprel®)", "Landiolol (Rapibloc®)", "Lidocaïne®", "Milrinone (Corotrope®)",
      "Clonidine (Catapressan®)", "Labetalol (Trandate®)", "Nicardipine (Loxen®)",
      "Urapidil (Eupressyl®)", "Dexmédétomidine (Dexdor®)"
    ],
  },
  {
    drug: "Propofol (Diprivan®)",
    short: "Propo.",
    color: "#eab308",
    items: [
      { with: "Amiodarone (Cordarone®)", type: "incompatible", note: "" },
      { with: "Lidocaïne®", type: "incompatible", note: "" },
    ],
    compatibleWith: [
      "Adrénaline®", "Dobutamine®", "Norépinéphrine (Noradrénaline®)", "Isoprénaline (Isuprel®)",
      "Milrinone (Corotrope®)", "Clonidine (Catapressan®)", "Isosorbide (Risordan®)",
      "Labetalol (Trandate®)", "Bumétanide (Burinex®)", "Furosémide (Lasilix®)",
      "Dexmédétomidine (Dexdor®)", "Midazolam (Hypnovel®)"
    ],
    exclusif: true,
  },
  {
    drug: "Kétamine®",
    short: "Kétam.",
    color: "#22d3ee",
    items: [
      { with: "Furosémide (Lasilix®)", type: "incompatible", note: "" },
    ],
    compatibleWith: [
      "Adrénaline®", "Dobutamine®", "Norépinéphrine (Noradrénaline®)", "Amiodarone (Cordarone®)",
      "Isoprénaline (Isuprel®)", "Lidocaïne®", "Milrinone (Corotrope®)", "Clonidine (Catapressan®)",
      "Labetalol (Trandate®)", "Nicardipine (Loxen®)", "Dexmédétomidine (Dexdor®)",
      "Midazolam (Hypnovel®)", "Propofol (Diprivan®)"
    ],
  },
  {
    drug: "Morphine®",
    short: "Morph.",
    color: "#fb7185",
    items: [
      { with: "Furosémide (Lasilix®)", type: "incompatible", note: "" },
    ],
    compatibleWith: [
      "Adrénaline®", "Dobutamine®", "Norépinéphrine (Noradrénaline®)", "Amiodarone (Cordarone®)",
      "Landiolol (Rapibloc®)", "Milrinone (Corotrope®)", "Clonidine (Catapressan®)",
      "Labetalol (Trandate®)", "Nicardipine (Loxen®)", "Urapidil (Eupressyl®)",
      "Dexmédétomidine (Dexdor®)", "Midazolam (Hypnovel®)", "Kétamine®"
    ],
  },
  {
    drug: "Néfopam (Acupan®)",
    short: "Néfop.",
    color: "#10b981",
    items: [
      { with: "Furosémide (Lasilix®)", type: "incompatible", note: "" },
    ],
    compatibleWith: [
      "Amiodarone (Cordarone®)", "Landiolol (Rapibloc®)", "Isosorbide (Risordan®)",
      "Nicardipine (Loxen®)", "Urapidil (Eupressyl®)", "Midazolam (Hypnovel®)", "Morphine®"
    ],
  },
  {
    drug: "Rémifentanil (Ultiva®)",
    short: "Rémif.",
    color: "#06b6d4",
    items: [],
    compatibleWith: [
      "Adrénaline®", "Dobutamine®", "Norépinéphrine (Noradrénaline®)", "Isoprénaline (Isuprel®)",
      "Lidocaïne®", "Dexmédétomidine (Dexdor®)", "Midazolam (Hypnovel®)"
    ],
  },
  {
    drug: "Sufentanil®",
    short: "Sufen.",
    color: "#a855f7",
    items: [
      { with: "Clonidine (Catapressan®)", type: "incompatible", note: "" },
      { with: "Urapidil (Eupressyl®)", type: "incompatible", note: "" },
    ],
    compatibleWith: [
      "Adrénaline®", "Dobutamine®", "Norépinéphrine (Noradrénaline®)", "Amiodarone (Cordarone®)",
      "Isoprénaline (Isuprel®)", "Lidocaïne®", "Milrinone (Corotrope®)", "Isosorbide (Risordan®)",
      "Labetalol (Trandate®)", "Nicardipine (Loxen®)", "Furosémide (Lasilix®)",
      "Dexmédétomidine (Dexdor®)", "Midazolam (Hypnovel®)", "Propofol (Diprivan®)", "Kétamine®",
      "Morphine®", "Rémifentanil (Ultiva®)"
    ],
  },
  {
    drug: "Cisatracurium (Nimbex®)",
    short: "Cisat.",
    color: "#ef4444",
    items: [
      { with: "Furosémide (Lasilix®)", type: "incompatible", note: "" },
      { with: "Propofol (Diprivan®)", type: "incompatible", note: "" },
    ],
    compatibleWith: [
      "Adrénaline®", "Dobutamine®", "Norépinéphrine (Noradrénaline®)", "Amiodarone (Cordarone®)",
      "Isoprénaline (Isuprel®)", "Landiolol (Rapibloc®)", "Lidocaïne®", "Clonidine (Catapressan®)",
      "Labetalol (Trandate®)", "Nicardipine (Loxen®)", "Urapidil (Eupressyl®)", "Bumétanide (Burinex®)",
      "Dexmédétomidine (Dexdor®)", "Midazolam (Hypnovel®)", "Morphine®", "Néfopam (Acupan®)",
      "Rémifentanil (Ultiva®)", "Sufentanil®"
    ],
  },
  {
    drug: "Fosphenytoïne (Prodilantin®)",
    short: "Fosph.",
    color: "#64748b",
    items: [],
    compatibleWith: [
      "Lidocaïne®", "Isosorbide (Risordan®)", "Furosémide (Lasilix®)", "Propofol (Diprivan®)",
      "Sufentanil®"
    ],
  },
  {
    drug: "Phénobarbital (Gardenal®)",
    short: "Phéno.",
    color: "#92400e",
    items: [
      { with: "Norépinéphrine (Noradrénaline®)", type: "incompatible", note: "" },
      { with: "Kétamine®", type: "incompatible", note: "" },
    ],
    compatibleWith: [],
  },
  {
    drug: "Thiopental (Penthotal®)",
    short: "Thiop.",
    color: "#b45309",
    items: [
      { with: "Adrénaline®", type: "incompatible", note: "" },
      { with: "Dobutamine®", type: "incompatible", note: "" },
      { with: "Norépinéphrine (Noradrénaline®)", type: "incompatible", note: "" },
      { with: "Lidocaïne®", type: "incompatible", note: "" },
      { with: "Labetalol (Trandate®)", type: "incompatible", note: "" },
      { with: "Nicardipine (Loxen®)", type: "incompatible", note: "" },
      { with: "Midazolam (Hypnovel®)", type: "incompatible", note: "" },
      { with: "Kétamine®", type: "incompatible", note: "" },
      { with: "Morphine®", type: "incompatible", note: "" },
    ],
    compatibleWith: [
      "Dexmédétomidine (Dexdor®)", "Propofol (Diprivan®)", "Rémifentanil (Ultiva®)"
    ],
  },
  {
    drug: "Valproate de sodium (Dépakine®)",
    short: "Valpr.",
    color: "#4f46e5",
    items: [
      { with: "Midazolam (Hypnovel®)", type: "incompatible", note: "" },
    ],
    compatibleWith: [
      "Dobutamine®", "Lidocaïne®", "Clonidine (Catapressan®)", "Isosorbide (Risordan®)",
      "Furosémide (Lasilix®)", "Dexmédétomidine (Dexdor®)", "Propofol (Diprivan®)", "Sufentanil®",
      "Fosphenytoïne (Prodilantin®)", "Thiopental (Penthotal®)"
    ],
  },
  {
    drug: "Argatroban (Arganova®)",
    short: "Argat.",
    color: "#f97316",
    items: [
      { with: "Amiodarone (Cordarone®)", type: "incompatible", note: "" },
    ],
    compatibleWith: [
      "Dobutamine®", "Norépinéphrine (Noradrénaline®)", "Lidocaïne®", "Milrinone (Corotrope®)",
      "Furosémide (Lasilix®)", "Midazolam (Hypnovel®)", "Sufentanil®"
    ],
  },
  {
    drug: "Danaparoïde sodique (Orgaran®)",
    short: "Danap.",
    color: "#78716c",
    items: [],
    compatibleWith: [
      "Lidocaïne®", "Isosorbide (Risordan®)", "Furosémide (Lasilix®)", "Propofol (Diprivan®)",
      "Sufentanil®", "Fosphenytoïne (Prodilantin®)", "Valproate de sodium (Dépakine®)"
    ],
  },
  {
    drug: "Héparine sodique",
    short: "Hépar.",
    color: "#0f766e",
    items: [
      { with: "Dobutamine®", type: "incompatible", note: "" },
      { with: "Amiodarone (Cordarone®)", type: "incompatible", note: "" },
      { with: "Labetalol (Trandate®)", type: "incompatible", note: "" },
      { with: "Nicardipine (Loxen®)", type: "incompatible", note: "" },
      { with: "Kétamine®", type: "incompatible", note: "" },
      { with: "Néfopam (Acupan®)", type: "incompatible", note: "" },
      { with: "Cisatracurium (Nimbex®)", type: "incompatible", note: "" },
    ],
    compatibleWith: [
      "Adrénaline®", "Norépinéphrine (Noradrénaline®)", "Isoprénaline (Isuprel®)",
      "Landiolol (Rapibloc®)", "Lidocaïne®", "Milrinone (Corotrope®)", "Clonidine (Catapressan®)",
      "Urapidil (Eupressyl®)", "Furosémide (Lasilix®)", "Dexmédétomidine (Dexdor®)",
      "Midazolam (Hypnovel®)", "Propofol (Diprivan®)", "Morphine®", "Rémifentanil (Ultiva®)",
      "Sufentanil®"
    ],
  },
  {
    drug: "Acétylcystéine (Hidonac®)",
    short: "Acéty.",
    color: "#65a30d",
    items: [
      { with: "Adrénaline®", type: "incompatible", note: "" },
      { with: "Dobutamine®", type: "incompatible", note: "" },
    ],
    compatibleWith: [
      "Norépinéphrine (Noradrénaline®)", "Amiodarone (Cordarone®)", "Lidocaïne®",
      "Milrinone (Corotrope®)", "Labetalol (Trandate®)", "Furosémide (Lasilix®)",
      "Dexmédétomidine (Dexdor®)", "Midazolam (Hypnovel®)", "Héparine sodique"
    ],
  },
  {
    drug: "Glucagon (Glucagen®)",
    short: "Gluca.",
    color: "#15803d",
    items: [],
    compatibleWith: [],
  },
  {
    drug: "Naloxone (Narcan®)",
    short: "Nalox.",
    color: "#dc2626",
    items: [
      { with: "Thiopental (Penthotal®)", type: "incompatible", note: "" },
    ],
    compatibleWith: [
      "Adrénaline®", "Dobutamine®", "Norépinéphrine (Noradrénaline®)", "Amiodarone (Cordarone®)",
      "Isoprénaline (Isuprel®)", "Lidocaïne®", "Milrinone (Corotrope®)", "Labetalol (Trandate®)",
      "Furosémide (Lasilix®)", "Midazolam (Hypnovel®)", "Kétamine®", "Sufentanil®",
      "Phénobarbital (Gardenal®)", "Valproate de sodium (Dépakine®)", "Héparine sodique",
      "Acétylcystéine (Hidonac®)"
    ],
  },
  {
    drug: "Hydrocortisone",
    short: "Hydro.",
    color: "#2563eb",
    items: [
      { with: "Labetalol (Trandate®)", type: "incompatible", note: "" },
      { with: "Thiopental (Penthotal®)", type: "incompatible", note: "" },
    ],
    compatibleWith: [
      "Adrénaline®", "Norépinéphrine (Noradrénaline®)", "Amiodarone (Cordarone®)",
      "Isoprénaline (Isuprel®)", "Lidocaïne®", "Isosorbide (Risordan®)", "Nicardipine (Loxen®)",
      "Furosémide (Lasilix®)", "Dexmédétomidine (Dexdor®)", "Propofol (Diprivan®)", "Kétamine®",
      "Néfopam (Acupan®)", "Rémifentanil (Ultiva®)", "Sufentanil®", "Cisatracurium (Nimbex®)",
      "Fosphenytoïne (Prodilantin®)", "Valproate de sodium (Dépakine®)", "Argatroban (Arganova®)",
      "Danaparoïde sodique (Orgaran®)", "Acétylcystéine (Hidonac®)", "Naloxone (Narcan®)"
    ],
  },
  {
    drug: "Insuline asparte (Novorapid®)",
    short: "Insul.",
    color: "#16a34a",
    items: [
      { with: "Kétamine®", type: "incompatible", note: "" },
      { with: "Cisatracurium (Nimbex®)", type: "incompatible", note: "" },
    ],
    compatibleWith: [
      "Dobutamine®", "Norépinéphrine (Noradrénaline®)", "Amiodarone (Cordarone®)",
      "Isoprénaline (Isuprel®)", "Lidocaïne®", "Milrinone (Corotrope®)", "Clonidine (Catapressan®)",
      "Isosorbide (Risordan®)", "Labetalol (Trandate®)", "Nicardipine (Loxen®)",
      "Urapidil (Eupressyl®)", "Furosémide (Lasilix®)", "Dexmédétomidine (Dexdor®)",
      "Midazolam (Hypnovel®)", "Propofol (Diprivan®)", "Morphine®", "Rémifentanil (Ultiva®)",
      "Sufentanil®", "Fosphenytoïne (Prodilantin®)", "Valproate de sodium (Dépakine®)",
      "Danaparoïde sodique (Orgaran®)", "Héparine sodique", "Hydrocortisone"
    ],
  },
  {
    drug: "Octréotide (Sandostatine®)",
    short: "Octré.",
    color: "#0891b2",
    items: [
      { with: "Thiopental (Penthotal®)", type: "incompatible", note: "" },
    ],
    compatibleWith: [
      "Adrénaline®", "Dobutamine®", "Norépinéphrine (Noradrénaline®)", "Amiodarone (Cordarone®)",
      "Milrinone (Corotrope®)", "Clonidine (Catapressan®)", "Labetalol (Trandate®)",
      "Nicardipine (Loxen®)", "Furosémide (Lasilix®)", "Dexmédétomidine (Dexdor®)",
      "Midazolam (Hypnovel®)", "Kétamine®", "Morphine®", "Sufentanil®", "Naloxone (Narcan®)",
      "Insuline asparte (Novorapid®)"
    ],
  },
  {
    drug: "Oméprazole®",
    short: "Omépr.",
    color: "#9333ea",
    items: [
      { with: "Adrénaline®", type: "incompatible", note: "" },
      { with: "Dobutamine®", type: "incompatible", note: "" },
      { with: "Norépinéphrine (Noradrénaline®)", type: "incompatible", note: "" },
      { with: "Amiodarone (Cordarone®)", type: "incompatible", note: "" },
      { with: "Isoprénaline (Isuprel®)", type: "incompatible", note: "" },
      { with: "Milrinone (Corotrope®)", type: "incompatible", note: "" },
      { with: "Clonidine (Catapressan®)", type: "incompatible", note: "" },
      { with: "Labetalol (Trandate®)", type: "incompatible", note: "" },
      { with: "Nicardipine (Loxen®)", type: "incompatible", note: "" },
      { with: "Urapidil (Eupressyl®)", type: "incompatible", note: "" },
      { with: "Midazolam (Hypnovel®)", type: "incompatible", note: "" },
      { with: "Kétamine®", type: "incompatible", note: "" },
      { with: "Morphine®", type: "incompatible", note: "" },
      { with: "Néfopam (Acupan®)", type: "incompatible", note: "" },
    ],
    compatibleWith: [
      "Lidocaïne®", "Isosorbide (Risordan®)", "Furosémide (Lasilix®)", "Propofol (Diprivan®)",
      "Sufentanil®", "Cisatracurium (Nimbex®)", "Fosphenytoïne (Prodilantin®)",
      "Valproate de sodium (Dépakine®)", "Danaparoïde sodique (Orgaran®)", "Hydrocortisone",
      "Insuline asparte (Novorapid®)"
    ],
  },
  {
    drug: "Salbutamol®",
    short: "Salbu.",
    color: "#ea580c",
    items: [
      { with: "Cisatracurium (Nimbex®)", type: "incompatible", note: "" },
      { with: "Thiopental (Penthotal®)", type: "incompatible", note: "" },
      { with: "Octréotide (Sandostatine®)", type: "incompatible", note: "" },
      { with: "Oméprazole®", type: "incompatible", note: "" },
    ],
    compatibleWith: [
      "Dobutamine®", "Norépinéphrine (Noradrénaline®)", "Amiodarone (Cordarone®)", "Lidocaïne®",
      "Milrinone (Corotrope®)", "Isosorbide (Risordan®)", "Furosémide (Lasilix®)",
      "Dexmédétomidine (Dexdor®)", "Midazolam (Hypnovel®)", "Propofol (Diprivan®)", "Sufentanil®",
      "Fosphenytoïne (Prodilantin®)", "Danaparoïde sodique (Orgaran®)", "Héparine sodique",
      "Naloxone (Narcan®)", "Hydrocortisone", "Insuline asparte (Novorapid®)"
    ],
  },
  {
    drug: "Somatostatine",
    short: "Somat.",
    color: "#0d9488",
    items: [],
    compatibleWith: [
      "Adrénaline®", "Dobutamine®", "Norépinéphrine (Noradrénaline®)", "Amiodarone (Cordarone®)",
      "Clonidine (Catapressan®)", "Labetalol (Trandate®)", "Nicardipine (Loxen®)",
      "Dexmédétomidine (Dexdor®)", "Kétamine®", "Morphine®", "Octréotide (Sandostatine®)"
    ],
  },
  {
    drug: "Tranexamique acide (Exacyl®)",
    short: "Trane.",
    color: "#be123c",
    items: [],
    compatibleWith: [
      "Dexmédétomidine (Dexdor®)", "Héparine sodique"
    ],
  },
  {
    drug: "Amoxicilline (Clamoxyl®)",
    short: "Amoxi.",
    color: "#0284c7",
    items: [
      { with: "Midazolam (Hypnovel®)", type: "incompatible", note: "" },
      { with: "Néfopam (Acupan®)", type: "incompatible", note: "" },
    ],
    compatibleWith: [],
  },
  {
    drug: "Aztréonam (Azactam®)",
    short: "Aztré.",
    color: "#7c2d12",
    items: [],
    compatibleWith: [
      "Dobutamine®", "Nicardipine (Loxen®)", "Furosémide (Lasilix®)", "Dexmédétomidine (Dexdor®)",
      "Propofol (Diprivan®)", "Rémifentanil (Ultiva®)", "Cisatracurium (Nimbex®)", "Héparine sodique",
      "Hydrocortisone"
    ],
  },
  {
    drug: "Céfazoline",
    short: "Céfaz.",
    color: "#4d7c0f",
    items: [
      { with: "Dobutamine®", type: "incompatible", note: "" },
      { with: "Amiodarone (Cordarone®)", type: "incompatible", note: "" },
      { with: "Néfopam (Acupan®)", type: "incompatible", note: "" },
      { with: "Thiopental (Penthotal®)", type: "incompatible", note: "" },
      { with: "Acétylcystéine (Hidonac®)", type: "incompatible", note: "" },
      { with: "Naloxone (Narcan®)", type: "incompatible", note: "" },
    ],
    compatibleWith: [
      "Adrénaline®", "Milrinone (Corotrope®)", "Nicardipine (Loxen®)", "Furosémide (Lasilix®)",
      "Dexmédétomidine (Dexdor®)", "Midazolam (Hypnovel®)", "Propofol (Diprivan®)", "Kétamine®",
      "Morphine®", "Rémifentanil (Ultiva®)", "Sufentanil®", "Héparine sodique",
      "Insuline asparte (Novorapid®)", "Octréotide (Sandostatine®)", "Salbutamol®",
      "Aztréonam (Azactam®)"
    ],
  },
  {
    drug: "Céfépime (Axépim®)",
    short: "Céfép.",
    color: "#0369a1",
    items: [
      { with: "Labetalol (Trandate®)", type: "incompatible", note: "" },
      { with: "Nicardipine (Loxen®)", type: "incompatible", note: "" },
      { with: "Midazolam (Hypnovel®)", type: "incompatible", note: "" },
      { with: "Propofol (Diprivan®)", type: "incompatible", note: "" },
      { with: "Morphine®", type: "incompatible", note: "" },
      { with: "Acétylcystéine (Hidonac®)", type: "incompatible", note: "" },
    ],
    compatibleWith: [
      "Lidocaïne®", "Milrinone (Corotrope®)", "Isosorbide (Risordan®)", "Urapidil (Eupressyl®)",
      "Furosémide (Lasilix®)", "Dexmédétomidine (Dexdor®)", "Kétamine®", "Rémifentanil (Ultiva®)",
      "Sufentanil®", "Valproate de sodium (Dépakine®)", "Héparine sodique", "Hydrocortisone",
      "Insuline asparte (Novorapid®)", "Octréotide (Sandostatine®)"
    ],
  },
  {
    drug: "Céfidérocol (Fetcroja®)",
    short: "Céfid.",
    color: "#7e22ce",
    items: [
      { with: "Dobutamine®", type: "incompatible", note: "" },
      { with: "Amiodarone (Cordarone®)", type: "incompatible", note: "" },
      { with: "Labetalol (Trandate®)", type: "incompatible", note: "" },
      { with: "Propofol (Diprivan®)", type: "incompatible", note: "" },
    ],
    compatibleWith: [
      "Adrénaline®", "Norépinéphrine (Noradrénaline®)", "Lidocaïne®", "Milrinone (Corotrope®)",
      "Nicardipine (Loxen®)", "Furosémide (Lasilix®)", "Dexmédétomidine (Dexdor®)",
      "Midazolam (Hypnovel®)", "Cisatracurium (Nimbex®)", "Héparine sodique", "Naloxone (Narcan®)",
      "Hydrocortisone", "Octréotide (Sandostatine®)", "Aztréonam (Azactam®)", "Céfazoline",
      "Céfépime (Axépim®)"
    ],
  },
  {
    drug: "Céfotaxime (Claforan®)",
    short: "Céfot.",
    color: "#15803d",
    items: [
      { with: "Néfopam (Acupan®)", type: "incompatible", note: "" },
      { with: "Thiopental (Penthotal®)", type: "incompatible", note: "" },
      { with: "Hydrocortisone", type: "incompatible", note: "" },
      { with: "Oméprazole®", type: "incompatible", note: "" },
      { with: "Salbutamol®", type: "incompatible", note: "" },
    ],
    compatibleWith: [
      "Amiodarone (Cordarone®)", "Dexmédétomidine (Dexdor®)", "Midazolam (Hypnovel®)",
      "Propofol (Diprivan®)", "Kétamine®", "Morphine®", "Rémifentanil (Ultiva®)", "Sufentanil®",
      "Héparine sodique", "Acétylcystéine (Hidonac®)", "Naloxone (Narcan®)", "Aztréonam (Azactam®)"
    ],
  },
  {
    drug: "Céfoxitine",
    short: "Céfox.",
    color: "#b91c1c",
    items: [
      { with: "Thiopental (Penthotal®)", type: "incompatible", note: "" },
    ],
    compatibleWith: [
      "Dexmédétomidine (Dexdor®)", "Propofol (Diprivan®)", "Rémifentanil (Ultiva®)",
      "Acétylcystéine (Hidonac®)", "Naloxone (Narcan®)", "Salbutamol®", "Aztréonam (Azactam®)"
    ],
  },
  {
    drug: "Ceftazidime (Fortum®)",
    short: "Cefta.",
    color: "#047857",
    items: [
      { with: "Amiodarone (Cordarone®)", type: "incompatible", note: "" },
      { with: "Nicardipine (Loxen®)", type: "incompatible", note: "" },
      { with: "Midazolam (Hypnovel®)", type: "incompatible", note: "" },
      { with: "Propofol (Diprivan®)", type: "incompatible", note: "" },
      { with: "Thiopental (Penthotal®)", type: "incompatible", note: "" },
      { with: "Salbutamol®", type: "incompatible", note: "" },
    ],
    compatibleWith: [
      "Adrénaline®", "Dobutamine®", "Norépinéphrine (Noradrénaline®)", "Landiolol (Rapibloc®)",
      "Milrinone (Corotrope®)", "Isosorbide (Risordan®)", "Labetalol (Trandate®)",
      "Urapidil (Eupressyl®)", "Furosémide (Lasilix®)", "Dexmédétomidine (Dexdor®)", "Kétamine®",
      "Morphine®", "Néfopam (Acupan®)", "Rémifentanil (Ultiva®)", "Sufentanil®",
      "Cisatracurium (Nimbex®)", "Valproate de sodium (Dépakine®)", "Héparine sodique",
      "Naloxone (Narcan®)", "Insuline asparte (Novorapid®)", "Octréotide (Sandostatine®)",
      "Aztréonam (Azactam®)", "Céfazoline"
    ],
  },
  {
    drug: "Ceftazidime + Avibactam (Zavicefta®)",
    short: "Cefta.",
    color: "#4338ca",
    items: [],
    compatibleWith: [
      "Aztréonam (Azactam®)", "Céfidérocol (Fetcroja®)"
    ],
  },
  {
    drug: "Cloxacilline (Orbénine®)",
    short: "Cloxa.",
    color: "#c2410c",
    items: [
      { with: "Dobutamine®", type: "incompatible", note: "" },
      { with: "Labetalol (Trandate®)", type: "incompatible", note: "" },
      { with: "Midazolam (Hypnovel®)", type: "incompatible", note: "" },
      { with: "Thiopental (Penthotal®)", type: "incompatible", note: "" },
    ],
    compatibleWith: [
      "Adrénaline®", "Norépinéphrine (Noradrénaline®)", "Amiodarone (Cordarone®)",
      "Isoprénaline (Isuprel®)", "Lidocaïne®", "Milrinone (Corotrope®)", "Furosémide (Lasilix®)",
      "Dexmédétomidine (Dexdor®)", "Kétamine®", "Sufentanil®", "Valproate de sodium (Dépakine®)",
      "Héparine sodique", "Naloxone (Narcan®)", "Hydrocortisone", "Salbutamol®", "Céfazoline",
      "Céfotaxime (Claforan®)", "Céfoxitine", "Ceftazidime (Fortum®)"
    ],
  },
  {
    drug: "Meronem (Meropenem®)",
    short: "Meron.",
    color: "#57534e",
    items: [
      { with: "Amiodarone (Cordarone®)", type: "incompatible", note: "" },
      { with: "Nicardipine (Loxen®)", type: "incompatible", note: "" },
      { with: "Midazolam (Hypnovel®)", type: "incompatible", note: "" },
      { with: "Kétamine®", type: "incompatible", note: "" },
      { with: "Thiopental (Penthotal®)", type: "incompatible", note: "" },
    ],
    compatibleWith: [
      "Adrénaline®", "Dobutamine®", "Norépinéphrine (Noradrénaline®)", "Isoprénaline (Isuprel®)",
      "Lidocaïne®", "Milrinone (Corotrope®)", "Labetalol (Trandate®)", "Furosémide (Lasilix®)",
      "Dexmédétomidine (Dexdor®)", "Morphine®", "Sufentanil®", "Phénobarbital (Gardenal®)",
      "Valproate de sodium (Dépakine®)", "Héparine sodique", "Acétylcystéine (Hidonac®)",
      "Naloxone (Narcan®)", "Hydrocortisone", "Octréotide (Sandostatine®)", "Salbutamol®",
      "Aztréonam (Azactam®)", "Céfazoline", "Céfidérocol (Fetcroja®)", "Céfotaxime (Claforan®)",
      "Céfoxitine", "Ceftazidime (Fortum®)", "Cloxacilline (Orbénine®)"
    ],
  },
  {
    drug: "Penicilline G",
    short: "Penic.",
    color: "#1d4ed8",
    items: [
      { with: "Dobutamine®", type: "incompatible", note: "" },
      { with: "Labetalol (Trandate®)", type: "incompatible", note: "" },
      { with: "Héparine sodique", type: "incompatible", note: "" },
      { with: "Insuline asparte (Novorapid®)", type: "incompatible", note: "" },
    ],
    compatibleWith: [
      "Adrénaline®", "Amiodarone (Cordarone®)", "Furosémide (Lasilix®)", "Dexmédétomidine (Dexdor®)",
      "Midazolam (Hypnovel®)", "Sufentanil®", "Céfazoline", "Ceftazidime (Fortum®)",
      "Cloxacilline (Orbénine®)", "Meronem (Meropenem®)"
    ],
  },
  {
    drug: "Piperacilline / tazobactam (Tazocilline®)",
    short: "Piper.",
    color: "#0f766e",
    items: [
      { with: "Dobutamine®", type: "incompatible", note: "" },
      { with: "Amiodarone (Cordarone®)", type: "incompatible", note: "" },
      { with: "Labetalol (Trandate®)", type: "incompatible", note: "" },
      { with: "Nicardipine (Loxen®)", type: "incompatible", note: "" },
      { with: "Propofol (Diprivan®)", type: "incompatible", note: "" },
      { with: "Thiopental (Penthotal®)", type: "incompatible", note: "" },
      { with: "Oméprazole®", type: "incompatible", note: "" },
      { with: "Salbutamol®", type: "incompatible", note: "" },
    ],
    compatibleWith: [
      "Adrénaline®", "Norépinéphrine (Noradrénaline®)", "Landiolol (Rapibloc®)",
      "Milrinone (Corotrope®)", "Urapidil (Eupressyl®)", "Furosémide (Lasilix®)",
      "Dexmédétomidine (Dexdor®)", "Midazolam (Hypnovel®)", "Kétamine®", "Morphine®",
      "Néfopam (Acupan®)", "Rémifentanil (Ultiva®)", "Sufentanil®", "Cisatracurium (Nimbex®)",
      "Héparine sodique", "Acétylcystéine (Hidonac®)", "Naloxone (Narcan®)", "Hydrocortisone",
      "Insuline asparte (Novorapid®)", "Octréotide (Sandostatine®)", "Aztréonam (Azactam®)",
      "Céfépime (Axépim®)", "Ceftazidime (Fortum®)", "Cloxacilline (Orbénine®)", "Meronem (Meropenem®)"
    ],
  },
  {
    drug: "Piperacilline (Piperilline®)",
    short: "Piper.",
    color: "#ca8a04",
    items: [
      { with: "Amiodarone (Cordarone®)", type: "incompatible", note: "" },
      { with: "Thiopental (Penthotal®)", type: "incompatible", note: "" },
      { with: "Salbutamol®", type: "incompatible", note: "" },
      { with: "Cloxacilline (Orbénine®)", type: "incompatible", note: "" },
    ],
    compatibleWith: [
      "Lidocaïne®", "Labetalol (Trandate®)", "Nicardipine (Loxen®)", "Dexmédétomidine (Dexdor®)",
      "Midazolam (Hypnovel®)", "Propofol (Diprivan®)", "Rémifentanil (Ultiva®)", "Héparine sodique",
      "Acétylcystéine (Hidonac®)", "Naloxone (Narcan®)", "Aztréonam (Azactam®)", "Meronem (Meropenem®)"
    ],
  },
  {
    drug: "Sulbactam + Ampicilline (Unacim®)",
    short: "Sulba.",
    color: "#2563eb",
    items: [],
    compatibleWith: [],
  },
  {
    drug: "Temocilline (Negaban®)",
    short: "Temoc.",
    color: "#854d0e",
    items: [
      { with: "Milrinone (Corotrope®)", type: "incompatible", note: "" },
      { with: "Nicardipine (Loxen®)", type: "incompatible", note: "" },
      { with: "Midazolam (Hypnovel®)", type: "incompatible", note: "" },
      { with: "Propofol (Diprivan®)", type: "incompatible", note: "" },
      { with: "Céfépime (Axépim®)", type: "incompatible", note: "" },
      { with: "Ceftazidime (Fortum®)", type: "incompatible", note: "" },
      { with: "Meronem (Meropenem®)", type: "incompatible", note: "" },
      { with: "Piperacilline / tazobactam (Tazocilline®)", type: "incompatible", note: "" },
    ],
    compatibleWith: [
      "Adrénaline®", "Dobutamine®", "Isosorbide (Risordan®)", "Urapidil (Eupressyl®)",
      "Furosémide (Lasilix®)", "Kétamine®", "Thiopental (Penthotal®)",
      "Valproate de sodium (Dépakine®)", "Acétylcystéine (Hidonac®)", "Oméprazole®"
    ],
  },
  {
    drug: "Vancomycine®",
    short: "Vanco.",
    color: "#16a34a",
    items: [
      { with: "Furosémide (Lasilix®)", type: "incompatible", note: "" },
      { with: "Propofol (Diprivan®)", type: "incompatible", note: "" },
      { with: "Thiopental (Penthotal®)", type: "incompatible", note: "" },
      { with: "Valproate de sodium (Dépakine®)", type: "incompatible", note: "" },
      { with: "Héparine sodique", type: "incompatible", note: "" },
      { with: "Hydrocortisone", type: "incompatible", note: "" },
      { with: "Oméprazole®", type: "incompatible", note: "" },
      { with: "Salbutamol®", type: "incompatible", note: "" },
      { with: "Amoxicilline (Clamoxyl®)", type: "incompatible", note: "" },
      { with: "Céfazoline", type: "incompatible", note: "" },
      { with: "Céfépime (Axépim®)", type: "incompatible", note: "" },
      { with: "Céfidérocol (Fetcroja®)", type: "incompatible", note: "" },
      { with: "Ceftazidime (Fortum®)", type: "incompatible", note: "" },
      { with: "Piperacilline / tazobactam (Tazocilline®)", type: "incompatible", note: "" },
      { with: "Temocilline (Negaban®)", type: "incompatible", note: "" },
    ],
    compatibleWith: [
      "Adrénaline®", "Dobutamine®", "Norépinéphrine (Noradrénaline®)", "Amiodarone (Cordarone®)",
      "Isoprénaline (Isuprel®)", "Lidocaïne®", "Milrinone (Corotrope®)", "Clonidine (Catapressan®)",
      "Isosorbide (Risordan®)", "Labetalol (Trandate®)", "Nicardipine (Loxen®)",
      "Urapidil (Eupressyl®)", "Dexmédétomidine (Dexdor®)", "Midazolam (Hypnovel®)", "Kétamine®",
      "Morphine®", "Néfopam (Acupan®)", "Rémifentanil (Ultiva®)", "Sufentanil®",
      "Cisatracurium (Nimbex®)", "Acétylcystéine (Hidonac®)", "Naloxone (Narcan®)",
      "Insuline asparte (Novorapid®)", "Octréotide (Sandostatine®)", "Somatostatine",
      "Meronem (Meropenem®)", "Penicilline G"
    ],
  },
  {
    drug: "Chlorure de potassium",
    short: "KCl",
    color: "#94a3b8",
    items: [
      { with: "Amiodarone (Cordarone®)", type: "incompatible", note: "" },
      { with: "Thiopental (Penthotal®)", type: "incompatible", note: "" },
      { with: "Salbutamol®", type: "incompatible", note: "" },
    ],
    compatibleWith: [
      "Adrénaline®", "Dobutamine®", "Isoprénaline (Isuprel®)", "Lidocaïne®", "Milrinone (Corotrope®)",
      "Clonidine (Catapressan®)", "Isosorbide (Risordan®)", "Labetalol (Trandate®)",
      "Nicardipine (Loxen®)", "Furosémide (Lasilix®)", "Dexmédétomidine (Dexdor®)",
      "Midazolam (Hypnovel®)", "Propofol (Diprivan®)", "Kétamine®", "Morphine®",
      "Rémifentanil (Ultiva®)", "Sufentanil®", "Cisatracurium (Nimbex®)",
      "Fosphenytoïne (Prodilantin®)", "Valproate de sodium (Dépakine®)",
      "Danaparoïde sodique (Orgaran®)", "Héparine sodique", "Acétylcystéine (Hidonac®)",
      "Naloxone (Narcan®)", "Hydrocortisone", "Insuline asparte (Novorapid®)",
      "Octréotide (Sandostatine®)", "Oméprazole®", "Aztréonam (Azactam®)", "Céfazoline",
      "Céfépime (Axépim®)", "Céfidérocol (Fetcroja®)", "Ceftazidime (Fortum®)",
      "Cloxacilline (Orbénine®)", "Meronem (Meropenem®)", "Penicilline G",
      "Piperacilline / tazobactam (Tazocilline®)", "Vancomycine®"
    ],
  },
  {
    drug: "Sulfate de magnésium",
    short: "MgSO4",
    color: "#0ea5e9",
    items: [
      { with: "Norépinéphrine (Noradrénaline®)", type: "incompatible", note: "" },
      { with: "Amiodarone (Cordarone®)", type: "incompatible", note: "" },
      { with: "Thiopental (Penthotal®)", type: "incompatible", note: "" },
      { with: "Amoxicilline (Clamoxyl®)", type: "incompatible", note: "" },
      { with: "Céfépime (Axépim®)", type: "incompatible", note: "" },
    ],
    compatibleWith: [
      "Adrénaline®", "Isoprénaline (Isuprel®)", "Landiolol (Rapibloc®)", "Lidocaïne®",
      "Milrinone (Corotrope®)", "Clonidine (Catapressan®)", "Labetalol (Trandate®)",
      "Nicardipine (Loxen®)", "Urapidil (Eupressyl®)", "Dexmédétomidine (Dexdor®)",
      "Midazolam (Hypnovel®)", "Propofol (Diprivan®)", "Kétamine®", "Morphine®", "Néfopam (Acupan®)",
      "Rémifentanil (Ultiva®)", "Sufentanil®", "Cisatracurium (Nimbex®)",
      "Valproate de sodium (Dépakine®)", "Héparine sodique", "Naloxone (Narcan®)",
      "Insuline asparte (Novorapid®)", "Octréotide (Sandostatine®)", "Salbutamol®",
      "Aztréonam (Azactam®)", "Céfazoline", "Céfidérocol (Fetcroja®)", "Céfotaxime (Claforan®)",
      "Céfoxitine", "Ceftazidime (Fortum®)", "Cloxacilline (Orbénine®)", "Meronem (Meropenem®)",
      "Penicilline G", "Piperacilline / tazobactam (Tazocilline®)", "Piperacilline (Piperilline®)",
      "Vancomycine®", "Chlorure de potassium"
    ],
  },
  {
    drug: "Smofkabiven® / Reanutriflex®",
    short: "Smofk.",
    color: "#365314",
    items: [
      { with: "Amiodarone (Cordarone®)", type: "incompatible", note: "" },
      { with: "Labetalol (Trandate®)", type: "incompatible", note: "" },
      { with: "Propofol (Diprivan®)", type: "incompatible", note: "" },
      { with: "Oméprazole®", type: "incompatible", note: "" },
    ],
    compatibleWith: [
      "Landiolol (Rapibloc®)", "Urapidil (Eupressyl®)", "Furosémide (Lasilix®)",
      "Dexmédétomidine (Dexdor®)", "Midazolam (Hypnovel®)", "Morphine®", "Néfopam (Acupan®)",
      "Sufentanil®", "Cisatracurium (Nimbex®)", "Héparine sodique", "Insuline asparte (Novorapid®)",
      "Octréotide (Sandostatine®)", "Céfépime (Axépim®)", "Ceftazidime (Fortum®)",
      "Meronem (Meropenem®)", "Piperacilline / tazobactam (Tazocilline®)", "Vancomycine®",
      "Chlorure de potassium", "Sulfate de magnésium"
    ],
    exclusif: true,
  },
];
