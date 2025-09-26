# Insyte CRM n8n Node - Detailed Implementation Plan

## Project Overview
Create a custom n8n node for the Insyte CRM API (Window Furnishings Industry)
- Base URL: https://new-api.insyteblinds.com
- API Type: OData-enabled REST API
- Versions: v1 and v2 endpoints available

## API Analysis

### Core Resources (Both v1 and v2)
1. **Activities** - Task/activity management
2. **Companies** - Business entity management
3. **Contacts** - Customer contact management
4. **Invoices** - Invoice management with line items
5. **Jobs** - Job/project management
6. **Opportunities** - Sales opportunity tracking
7. **Payments** - Payment processing
8. **SupplyJobs** - Supply chain job management
9. **Users** - User management
10. **TaxRates** - Tax configuration

### v2-Only Resources
- **Promotions** - Promotional offers
- **OpportunityProductOfInterest** - Product interest tracking
- **JobLinePromotions** - Job-specific promotions
- Various tax-related endpoints

### Special Endpoints
- **LiveDiary/Sales/Availability** - Check availability
- **LiveDiary/Sales/BookLead** - Book appointments

## Technical Architecture

### Node Style
- **Type**: Programmatic (due to complexity)
- **Pattern**: Resource-based with operations
- **API Version**: Default to v2, with v1 fallback option

### Authentication
- API Key based (header/query parameter)
- Base URL configuration
- Optional custom headers

### Key Features
1. **OData Support**
   - $filter - filtering results
   - $select - field selection
   - $expand - relationship expansion
   - $orderby - sorting
   - $top/$skip - pagination

2. **Content Type Handling**
   - Default: application/json
   - Support OData metadata levels
   - Handle multiple response formats

## Implementation Steps

### Phase 1: Project Setup
```bash
# 1. Clone starter template
git clone https://github.com/n8n-io/n8n-nodes-starter.git .

# 2. Clean up example files
rm -rf nodes/FriendGrid
rm -rf credentials/FriendGridApi*

# 3. Install dependencies
npm install

# 4. Update package.json
```

### Phase 2: Credentials Implementation
```typescript
// credentials/InsyteApi.credentials.ts
- API Key field
- Base URL field (default: https://new-api.insyteblinds.com)
- API Version selector (v1/v2)
- Custom headers option
```

### Phase 3: Node Structure
```typescript
// nodes/Insyte/Insyte.node.ts
interface INodeTypeDescription {
  displayName: 'Insyte CRM',
  name: 'insyte',
  group: ['transform'],
  version: 1,
  subtitle: '={{$parameter["operation"] + ": " + $parameter["resource"]}}',
  description: 'Interact with Insyte CRM API',
  defaults: {
    name: 'Insyte CRM',
  },
  inputs: ['main'],
  outputs: ['main'],
  credentials: [{
    name: 'insyteApi',
    required: true,
  }],
  properties: [
    // Resource selector
    {
      displayName: 'Resource',
      name: 'resource',
      type: 'options',
      options: [
        { name: 'Activity', value: 'activity' },
        { name: 'Company', value: 'company' },
        { name: 'Contact', value: 'contact' },
        { name: 'Invoice', value: 'invoice' },
        { name: 'Job', value: 'job' },
        { name: 'Opportunity', value: 'opportunity' },
        { name: 'Payment', value: 'payment' },
        // ... more resources
      ],
    },
    // Operation selector (dynamic based on resource)
    {
      displayName: 'Operation',
      name: 'operation',
      type: 'options',
      displayOptions: {
        show: {
          resource: ['activity'],
        },
      },
      options: [
        { name: 'Get All', value: 'getAll' },
        { name: 'Get', value: 'get' },
        { name: 'Create', value: 'create' },
        { name: 'Update', value: 'update' },
        { name: 'Delete', value: 'delete' },
      ],
    },
    // ... additional parameters
  ],
}
```

### Phase 4: Resource Implementation

#### Activity Resource Example
```typescript
// nodes/Insyte/resources/ActivityResource.ts
async function activityOperations(this: IExecuteFunctions, operation: string) {
  const credentials = await this.getCredentials('insyteApi');
  const baseUrl = credentials.baseUrl || 'https://new-api.insyteblinds.com';
  const version = credentials.apiVersion || 'v2';

  switch(operation) {
    case 'getAll':
      // Implement with OData support
      const filters = this.getNodeParameter('filters', 0, {});
      const queryParams = buildODataQuery(filters);
      return await makeApiRequest.call(this, 'GET', `/${version}/Activities${queryParams}`);

    case 'get':
      const id = this.getNodeParameter('id', 0);
      return await makeApiRequest.call(this, 'GET', `/${version}/Activities(${id})`);

    // ... other operations
  }
}
```

### Phase 5: Helper Functions
```typescript
// nodes/Insyte/helpers.ts

// OData query builder
function buildODataQuery(params: IODataParams): string {
  const query = [];
  if (params.filter) query.push(`$filter=${params.filter}`);
  if (params.select) query.push(`$select=${params.select}`);
  if (params.expand) query.push(`$expand=${params.expand}`);
  if (params.orderby) query.push(`$orderby=${params.orderby}`);
  if (params.top) query.push(`$top=${params.top}`);
  if (params.skip) query.push(`$skip=${params.skip}`);
  return query.length ? `?${query.join('&')}` : '';
}

// API request wrapper
async function makeApiRequest(
  this: IExecuteFunctions | ILoadOptionsFunctions,
  method: string,
  endpoint: string,
  body?: any,
  qs?: IDataObject,
): Promise<any> {
  const credentials = await this.getCredentials('insyteApi');
  const options: IHttpRequestOptions = {
    method,
    url: `${credentials.baseUrl}${endpoint}`,
    headers: {
      'Accept': 'application/json',
      'Content-Type': 'application/json',
    },
    json: true,
  };

  if (credentials.apiKey) {
    options.headers['Authorization'] = `Bearer ${credentials.apiKey}`;
  }

  if (body) options.body = body;
  if (qs) options.qs = qs;

  return await this.helpers.httpRequest(options);
}
```

### Phase 6: Testing Strategy
1. Unit tests for helper functions
2. Integration tests with mock API
3. Manual testing with real API
4. Example workflows for common use cases

### Phase 7: Documentation
1. README with installation instructions
2. API credential setup guide
3. Example workflows
4. Troubleshooting guide
5. Contribution guidelines

## Resource Priority Order
1. **High Priority** (Core CRM functions)
   - Contacts
   - Companies
   - Opportunities
   - Activities

2. **Medium Priority** (Transactional)
   - Jobs
   - Invoices
   - Payments

3. **Low Priority** (Supporting)
   - SupplyJobs
   - TaxRates
   - Users
   - LiveDiary

## File Structure
```
n8n-nodes-insyte-api/
├── package.json
├── tsconfig.json
├── .eslintrc.js
├── credentials/
│   ├── InsyteApi.credentials.ts
│   └── InsyteApi.credentials.json
├── nodes/
│   └── Insyte/
│       ├── Insyte.node.ts
│       ├── Insyte.node.json
│       ├── insyte.svg
│       ├── helpers.ts
│       ├── types.ts
│       └── resources/
│           ├── ActivityResource.ts
│           ├── CompanyResource.ts
│           ├── ContactResource.ts
│           ├── InvoiceResource.ts
│           ├── JobResource.ts
│           ├── OpportunityResource.ts
│           └── PaymentResource.ts
├── test/
│   ├── unit/
│   └── integration/
├── examples/
│   └── workflows/
└── README.md

## Next Steps
1. Initialize project with n8n-nodes-starter
2. Implement credentials
3. Create main node structure
4. Implement first resource (Contact)
5. Test with API
6. Add remaining resources iteratively
7. Create documentation and examples
8. Prepare for npm publishing