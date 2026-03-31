# canton-lending-pool

A peer-to-peer lending pool implemented using Daml smart contracts on the Canton Network.

## Overview

This project demonstrates a simplified P2P lending marketplace where borrowers can request loans by locking collateral, and lenders can fund these loans. The system supports:

*   **Collateral Locking:** Borrowers pledge assets as collateral to secure the loan.
*   **Loan Funding:** Lenders provide funds to fulfill the loan request.
*   **Interest Accrual:** Interest is calculated and added to the loan principal over time.
*   **Partial Repayment:** Borrowers can make partial repayments towards the outstanding loan balance.
*   **Collateral Release:** Upon full repayment, the collateral is returned to the borrower.
*   **Liquidation:** If the value of the collateral falls below a predefined threshold, the lender can liquidate the collateral to recover the outstanding loan.

This project aims to showcase the power of Daml smart contracts and the Canton Network in building secure and transparent financial applications.

## Prerequisites

Before you begin, ensure you have the following installed:

*   [Daml SDK](https://docs.daml.com/getting-started/installation.html) (version 3.1.0 or later)
*   [Canton](https://docs.canton.io/docs/) (for running a distributed ledger)
*   [Node.js](https://nodejs.org/) and [npm](https://www.npmjs.com/) (for the TypeScript client)

## Setup

1.  **Clone the repository:**

    ```bash
    git clone <repository_url>
    cd canton-lending-pool
    ```

2.  **Build the Daml project:**

    ```bash
    daml build
    ```

3.  **Generate the Daml ledger model:**

    ```bash
    daml codegen js . -o ui/src/generated
    ```

4.  **Install the TypeScript client dependencies:**

    ```bash
    cd ui
    npm install
    cd ..
    ```

## Running the Application

### Running the Daml Ledger

You can run the Daml ledger locally using the Daml Sandbox, or connect to a remote Canton network.

**Using Daml Sandbox:**

1.  Start the Daml Sandbox:

    ```bash
    daml ledger start --port 6865
    ```

2.  Upload the DAR file:
     ```bash
     daml ledger upload-dar .daml/dist/canton-lending-pool-0.1.0.dar --host localhost --port 6865
     ```

**Connecting to a Canton Network:**

1.  Configure your Canton participant to communicate with the desired network. Consult the Canton documentation for detailed instructions.

2. Ensure that the DAR file is deployed on the Canton network.

### Running the TypeScript Client

1.  **Configure environment variables:**

    Create a `.env` file in the `ui` directory with the following variables:

    ```
    REACT_APP_LEDGER_URL=http://localhost:7575
    REACT_APP_LEDGER_ID=your-ledger-id
    REACT_APP_APPLICATION_ID=canton-lending-pool
    REACT_APP_PARTY=Alice
    ```

    Replace `your-ledger-id` and `Alice` with the appropriate values.  If running against the sandbox, the `ledger-id` is `default`. You can change the party by adding other parties in the Sandbox (e.g. `daml sandbox -- --parties Alice,Bob`)

2.  **Start the TypeScript client:**

    ```bash
    cd ui
    npm start
    cd ..
    ```

    This will start the client application in your browser.

## Interacting with the Application

The client application provides a user interface for interacting with the lending pool. You can:

*   Create loan requests with collateral.
*   Fund loan requests as a lender.
*   Make repayments as a borrower.
*   Liquidate collateral as a lender (if the collateral value falls below the threshold).

## Project Structure

*   `daml/`: Contains the Daml smart contracts.
    *   `Main.daml`: Defines the core contracts for the lending pool.
*   `ui/`: Contains the TypeScript client application.
    *   `src/`: Contains the source code for the client.
    *   `src/generated/`: Contains the generated Daml ledger model code.
*   `.daml/`: Contains build artifacts.
*   `daml.yaml`: Daml project configuration file.

## Contributing

Contributions are welcome! Please feel free to submit pull requests or open issues to report bugs or suggest improvements.

## License

This project is licensed under the [MIT License](LICENSE).