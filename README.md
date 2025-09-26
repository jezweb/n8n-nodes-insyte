# n8n-nodes-insyte

This is an n8n community node for the [Insyte CRM API](https://new-api.insyteblinds.com/swagger/index.html), specifically designed for the Window Furnishings Industry.

## Features

Interact with the Insyte CRM API to manage:
- 📋 **Activities** - Tasks and activity management
- 🏢 **Companies** - Business entity management
- 👤 **Contacts** - Customer contact information
- 💵 **Invoices** - Invoice creation and management
- 🔨 **Jobs** - Job/project tracking
- 💼 **Opportunities** - Sales opportunity pipeline
- 💰 **Payments** - Payment processing and tracking

## Installation

Follow the [installation guide](https://docs.n8n.io/integrations/community-nodes/installation/) in the n8n community nodes documentation.

### Local Installation

1. Navigate to your n8n installation directory
2. Install the package:
```bash
npm install n8n-nodes-insyte
```
3. Restart n8n

### Docker Installation

Add the following to your docker-compose.yml:

```yaml
environment:
  - N8N_COMMUNITY_PACKAGES_ENABLED=true
```

Then install via the n8n UI or by adding to your dockerfile.

## Credentials

To use this node, you'll need:

1. **API Key** - Your Insyte API authentication key
2. **Base URL** - Default: `https://new-api.insyteblinds.com`
3. **API Version** - Choose between v1 or v2 (v2 recommended)

### Getting API Credentials

Contact your Insyte administrator or refer to the [Insyte API documentation](https://new-api.insyteblinds.com/swagger/index.html) for obtaining API credentials.

## Operations

Each resource supports the following operations:

- **Get Many** - Retrieve multiple records with OData filtering
- **Get** - Retrieve a single record by ID
- **Create** - Create a new record
- **Update** - Update an existing record
- **Delete** - Delete a record

### OData Query Support

The node supports OData query parameters for filtering and sorting:

- `$filter` - Filter results (e.g., `FirstName eq 'John'`)
- `$select` - Select specific fields
- `$orderby` - Sort results (e.g., `LastName desc`)
- `$expand` - Include related entities
- `$top` / `$skip` - Pagination

## Example Workflows

### 1. Get All Contacts

```json
{
  "resource": "contact",
  "operation": "getAll",
  "returnAll": true
}
```

### 2. Create a New Contact

```json
{
  "resource": "contact",
  "operation": "create",
  "fields": {
    "FirstName": "John",
    "LastName": "Doe",
    "Email": "john.doe@example.com",
    "Phone": "+61 2 9999 9999"
  }
}
```

### 3. Filter Companies by State

```json
{
  "resource": "company",
  "operation": "getAll",
  "additionalFields": {
    "filter": "State eq 'NSW'",
    "orderby": "Name asc"
  }
}
```

## Resources

### Contact Fields
- `FirstName`, `LastName`
- `Email`, `Phone`, `Mobile`
- `CompanyID`
- `Address`, `City`, `State`, `Postcode`

### Company Fields
- `Name`, `TradingName`
- `ABN`
- `Email`, `Phone`
- `Address`, `City`, `State`, `Postcode`

### Activity Fields
- `Subject`, `Description`
- `Type`, `Status`, `Priority`
- `DueDate`
- `ContactID`, `CompanyID`, `AssignedTo`

### Opportunity Fields
- `Name`, `Description`
- `Stage`, `Probability`, `Amount`
- `CloseDate`
- `ContactID`, `CompanyID`, `OwnerID`

### Job Fields
- `JobNumber`, `Description`
- `Status`
- `StartDate`, `EndDate`
- `TotalAmount`
- `ContactID`, `CompanyID`
- `SiteAddress`

### Invoice Fields
- `InvoiceNumber`
- `Date`, `DueDate`
- `Status`
- `TotalAmount`, `TaxAmount`
- `ContactID`, `CompanyID`, `JobID`

### Payment Fields
- `PaymentNumber`
- `Date`, `Amount`
- `Method`, `Reference`
- `ContactID`, `CompanyID`, `InvoiceID`

## Development

### Building from Source

```bash
# Clone the repository
git clone https://github.com/jezweb/n8n-nodes-insyte.git

# Install dependencies
npm install

# Build the node
npm run build

# Run tests
npm test
```

### Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## Support

For issues and feature requests, please use the [GitHub issues page](https://github.com/jezweb/n8n-nodes-insyte/issues).

## License

[MIT](LICENSE.md)

## Disclaimer

This is a community node and is not officially supported by Insyte or n8n. Use at your own risk.