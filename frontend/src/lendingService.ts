import { DamlContract, CreateCommand, ExerciseCommand } from './damlTypes';

// =================================================================================================
// Configuration
// =================================================================================================

const JSON_API_URL = process.env.REACT_APP_JSON_API_URL || "http://localhost:7575";

// =================================================================================================
// Type Definitions (Mirroring Daml Templates)
// =================================================================================================

// Based on Loan.daml:LoanRequest
export interface LoanRequest {
  borrower: string; // Party
  lender: string; // Party
  principal: string; // Decimal
  interestRate: string; // Decimal
  termInDays: string; // Int
  collateralLockCid: string; // ContractId Collateral.CollateralLock
}

// Based on Loan.daml:ActiveLoan
export interface ActiveLoan {
  borrower: string; // Party
  lender: string; // Party
  principal: string; // Decimal
  interestRate: string; // Decimal
  termInDays: string; // Int
  fundedDate: string; // Date
  collateralLockCid: string; // ContractId Collateral.CollateralLock
  repayments: { amount: string; date: string }[];
}

// Based on Collateral.daml:CollateralLock
export interface CollateralLock {
  owner: string; // Party
  custodian: string; // Party
  asset: string; // Text
  quantity: string; // Decimal
}

// =================================================================================================
// Generic API Client
// =================================================================================================

/**
 * A generic helper function to make requests to the JSON API.
 * @param endpoint The API endpoint (e.g., /v1/create).
 * @param token The JWT token for authentication.
 * @param body The request body.
 * @returns The JSON response from the API.
 */
async function apiRequest(endpoint: string, token: string, body: object): Promise<any> {
  try {
    const response = await fetch(`${JSON_API_URL}${endpoint}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify(body)
    });

    if (!response.ok) {
      const errorBody = await response.text();
      throw new Error(`API request failed with status ${response.status}: ${errorBody}`);
    }

    const jsonResponse = await response.json();

    if (jsonResponse.status !== 200) {
      throw new Error(`Ledger operation failed: ${JSON.stringify(jsonResponse.errors)}`);
    }

    return jsonResponse.result;

  } catch (error) {
    console.error(`Error in apiRequest to ${endpoint}:`, error);
    throw error;
  }
}

// =================================================================================================
// Ledger Interaction Service
// =================================================================================================

/**
 * Fetches all active contracts for a given template ID visible to the party.
 * @param token The party's JWT token.
 * @param templateId The full template ID (e.g., "Loan:LoanRequest").
 * @returns A promise that resolves to an array of contracts.
 */
export async function queryContracts<T>(token: string, templateId: string): Promise<DamlContract<T>[]> {
  return await apiRequest('/v1/query', token, { templateIds: [templateId] });
}

/**
 * Creates a CollateralLock contract. This is typically done by the borrower
 * before creating a loan request.
 * @param token The borrower's JWT token.
 * @param lockDetails The details of the collateral to lock.
 * @returns The created contract object.
 */
export async function createCollateralLock(token: string, lockDetails: {
  custodian: string;
  asset: string;
  quantity: string;
}): Promise<DamlContract<CollateralLock>> {
  const command: CreateCommand<CollateralLock> = {
    templateId: "Collateral:CollateralLock",
    payload: {
      // 'owner' is implicit as the signatory of the create command
      custodian: lockDetails.custodian,
      asset: lockDetails.asset,
      quantity: lockDetails.quantity
    }
  };
  return apiRequest('/v1/create', token, command);
}

/**
 * Creates a new LoanRequest contract on the ledger. Requires a pre-existing CollateralLock contract.
 * @param token The borrower's JWT token.
 * @param requestDetails The details of the loan request.
 * @returns The created contract object.
 */
export async function createLoanRequest(token: string, requestDetails: {
  lender: string;
  principal: string;
  interestRate: string;
  termInDays: string;
  collateralLockCid: string;
}): Promise<DamlContract<LoanRequest>> {
  const command: CreateCommand<LoanRequest> = {
    templateId: "Loan:LoanRequest",
    payload: requestDetails
  };
  return apiRequest('/v1/create', token, command);
}

/**
 * Exercises the Fund choice on a LoanRequest contract to activate the loan.
 * @param token The lender's JWT token.
 * @param loanRequestCid The ContractId of the LoanRequest to fund.
 * @returns The events generated by the choice exercise, including the created ActiveLoan contract.
 */
export async function fundLoan(token: string, loanRequestCid: string): Promise<any> {
  const command: ExerciseCommand<{}> = {
    templateId: "Loan:LoanRequest",
    contractId: loanRequestCid,
    choice: "Fund",
    argument: {}
  };
  return apiRequest('/v1/exercise', token, command);
}

/**
 * Exercises the Repay choice on an ActiveLoan contract.
 * @param token The borrower's JWT token.
 * @param activeLoanCid The ContractId of the ActiveLoan to repay.
 * @param amount The amount being repaid.
 * @returns The events generated by the choice exercise.
 */
export async function repayLoan(token: string, activeLoanCid: string, amount: string): Promise<any> {
  const command: ExerciseCommand<{ repaymentAmount: string }> = {
    templateId: "Loan:ActiveLoan",
    contractId: activeLoanCid,
    choice: "Repay",
    argument: {
      repaymentAmount: amount
    }
  };
  return apiRequest('/v1/exercise', token, command);
}

/**
 * Exercises the Liquidate choice on an overdue or undercollateralized ActiveLoan contract.
 * @param token The lender's JWT token.
 * @param activeLoanCid The ContractId of the ActiveLoan to liquidate.
 * @param oracle The party providing the collateral price.
 * @param collateralPrice The current market price of the collateral asset.
 * @returns The events generated by the choice exercise.
 */
export async function liquidateLoan(token: string, activeLoanCid: string, oracle: string, collateralPrice: string): Promise<any> {
  const command: ExerciseCommand<{ oracle: string; collateralPrice: string }> = {
    templateId: "Loan:ActiveLoan",
    contractId: activeLoanCid,
    choice: "Liquidate",
    argument: {
      oracle,
      collateralPrice
    }
  };
  return apiRequest('/v1/exercise', token, command);
}

// =================================================================================================
// Convenience Query Hooks (for use in React components)
// =================================================================================================

export const fetchLoanRequests = (token: string) =>
  queryContracts<LoanRequest>(token, "Loan:LoanRequest");

export const fetchActiveLoans = (token: string) =>
  queryContracts<ActiveLoan>(token, "Loan:ActiveLoan");

export const fetchCollateralLocks = (token: string) =>
  queryContracts<CollateralLock>(token, "Collateral:CollateralLock");