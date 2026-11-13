export interface Company {
  id: string;
  name: string;
  foundedYear: number;
  balance: number;
  reputation: number;
  employeeCount: number;
}

export type CompanyField = keyof Company;

export interface CompanyValidationResult {
  valid: boolean;
  errors: Partial<Record<CompanyField, string>>;
}

const MIN_COMPANY_NAME_LENGTH = 2;
const MAX_COMPANY_NAME_LENGTH = 40;
const MIN_FOUNDING_YEAR = 1995;
const MAX_FOUNDING_YEAR = 2100;
const MAX_EMPLOYEE_COUNT = 10_000_000;

export function validateCompany(company: Company): CompanyValidationResult {
  const errors: CompanyValidationResult["errors"] = {};
  const normalizedName = company.name.trim();

  if (company.id.trim().length === 0) {
    errors.id = "Company ID is required.";
  }

  if (normalizedName.length < MIN_COMPANY_NAME_LENGTH) {
    errors.name = "Company name must contain at least 2 characters.";
  } else if (normalizedName.length > MAX_COMPANY_NAME_LENGTH) {
    errors.name = "Company name must contain no more than 40 characters.";
  }

  if (
    !Number.isInteger(company.foundedYear) ||
    company.foundedYear < MIN_FOUNDING_YEAR ||
    company.foundedYear > MAX_FOUNDING_YEAR
  ) {
    errors.foundedYear = `Founding year must be between ${MIN_FOUNDING_YEAR} and ${MAX_FOUNDING_YEAR}.`;
  }

  if (!Number.isFinite(company.balance) || company.balance < 0) {
    errors.balance = "Company balance must be a finite non-negative amount.";
  }

  if (
    !Number.isFinite(company.reputation) ||
    company.reputation < 0 ||
    company.reputation > 100
  ) {
    errors.reputation = "Company reputation must be between 0 and 100.";
  }

  if (
    !Number.isInteger(company.employeeCount) ||
    company.employeeCount < 0 ||
    company.employeeCount > MAX_EMPLOYEE_COUNT
  ) {
    errors.employeeCount = `Employee count must be an integer between 0 and ${MAX_EMPLOYEE_COUNT}.`;
  }

  return {
    valid: Object.keys(errors).length === 0,
    errors,
  };
}
