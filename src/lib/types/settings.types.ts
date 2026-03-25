export type ContractArticle = {
  num: string;
  title: string;
  content: string;
};

export type CompanySettings = {
  name: string;
  logo_url?: string | null;
  primary_color?: string | null;
  address?: string | null;
  email?: string | null;
  phone?: string | null;
  contract_template?: {
    fullText?: string;
    articles?: ContractArticle[];
    specialConditions?: string;
  } | null;
};