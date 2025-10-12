# n8n-nodes-insyte - Claude Development Guide

## Project Overview

**n8n-nodes-insyte** is a community node for the Insyte CRM API, designed for the Window Furnishings Industry. It provides read-only access to CRM data and write access for booking sales appointments via Live Diary, with full AI tool integration.

- **Package**: n8n-nodes-insyte
- **Version**: 0.5.0+
- **Repository**: https://github.com/jezweb/n8n-nodes-insyte
- **npm**: https://www.npmjs.com/package/n8n-nodes-insyte
- **API**: https://new-api.insyteblinds.com

## **IMPORTANT: API Limitations**

The Insyte API is **primarily read-only**:
- ✅ **READ operations** (GET) supported on all CRM resources
- ❌ **WRITE operations** (POST/PATCH/DELETE) **NOT supported** on CRM resources
- ✅ **WRITE operations** **ONLY available** on LiveDiary endpoints (check availability, book leads)

This is by design in the Insyte API - CRM data modification happens through the Insyte application, while the API provides data access and online appointment booking.

## Project Structure

```
n8n-nodes-insyte-api/
├── credentials/
│   └── InsyteApi.credentials.ts    # API authentication
├── nodes/
│   └── Insyte/
│       ├── Insyte.node.ts          # Main node implementation
│       ├── helpers.ts              # API helpers & AI functions
│       └── insyte.svg              # Node icon
├── package.json                     # Package configuration
├── tsconfig.json                    # TypeScript config
└── swagger.json                     # API specification
```

## Core Resources

### Read-Only CRM Resources

The node provides read access to these Insyte CRM resources:
- **Activities** - View tasks and activity records
- **Companies** - View business entities
- **Contacts** - View customer contact information
- **Invoices** - View invoice records (with InvoiceLines)
- **Jobs** - View job/project data (with JobLines)
- **Opportunities** - View sales opportunity pipeline
- **Payments** - View payment records

### Write-Enabled Resources

- **Live Diary** - Check availability and book sales appointments (v0.3.0+)
  - Check Availability - Query available time slots
  - Book Lead - Create new lead with scheduled appointment

- **Custom Request** - Standalone HTTP requests for integrations (v0.5.0+)
  - Full control over HTTP method (GET, POST, PUT, PATCH, DELETE)
  - Complete URL support (independent of API credentials)
  - JSON request body editor
  - Query parameters support
  - Custom headers support
  - Perfect for Insyte web leads integration or other webhooks

## Operations Supported

### Standard CRM Resources (Read-Only)

Each CRM resource supports:
- **Search** - Natural language or OData filtering (AI-optimized)
- **Get Many** - List records with pagination
- **Get** - Retrieve by ID

### Live Diary Resource (Write Access)

- **Check Availability** - Query available appointment slots
- **Book Lead** - Create new lead with appointment

### Custom Request Resource (Standalone HTTP Requests)

- **Any HTTP Method** - Full control over HTTP requests
  - Complete URL (no API credentials required)
  - Custom request body (JSON)
  - Custom query parameters
  - Custom headers
  - Independent of Insyte API authentication

## AI Tool Features (v0.2.0+)

### Key Components

1. **`usableAsTool: true`** - Marks node as AI-tool compatible
2. **AI Mode Resource** - Dedicated resource type for natural language
3. **Smart Detection Functions** (in `helpers.ts`):
   - `detectResourceFromQuery()` - Identifies resource type
   - `detectOperationFromQuery()` - Determines operation
   - `parseAIQuery()` - Extracts parameters from natural language

### AI Query Examples
- "Find all contacts in NSW"
- "Search for companies named Acme Corporation"
- "Get invoices from last month"
- "Check available appointment slots next week"
- "Book an appointment for John Doe"

## Development Guidelines

### Building the Project

```bash
# Install dependencies
npm install

# Build TypeScript
npm run build

# Watch mode for development
npm run dev

# Lint code
npm run lint

# Fix linting issues
npm run lintfix
```

### Testing Locally

1. Build the project: `npm run build`
2. Link to n8n: `cd ~/.n8n/custom && npm link /path/to/n8n-nodes-insyte-api`
3. Restart n8n
4. Node will appear in n8n interface

### Code Style

- Use **TypeScript** with strict typing
- Follow n8n node conventions
- Keep helper functions in `helpers.ts`
- Use descriptive variable names
- Add JSDoc comments for functions

### API Integration

- **Base URL**: `https://new-api.insyteblinds.com`
- **API Versions**: v1 and v2 (default to v2)
- **Authentication**: Bearer token via API key
- **Format**: OData-enabled REST API
- **Response**: JSON with optional OData metadata

### OData Support

The API supports standard OData query parameters:
- `$filter` - Filter results
- `$select` - Choose fields
- `$orderby` - Sort results
- `$expand` - Include related entities
- `$top` / `$skip` - Pagination

Example filter: `FirstName eq 'John' and State eq 'NSW'`

## Publishing Updates

### Version Bumping

Follow semantic versioning:
- **Major** (1.0.0): Breaking changes
- **Minor** (0.2.0): New features, backward compatible
- **Patch** (0.2.1): Bug fixes

Update version in `package.json` before publishing.

### Publishing Process

```bash
# Build and test
npm run build

# Commit changes
git add -A
git commit -m "feat: description of changes"
git push

# Publish to npm
npm publish
```

### Commit Message Format

Use conventional commits:
- `feat:` - New features
- `fix:` - Bug fixes
- `docs:` - Documentation changes
- `refactor:` - Code refactoring
- `test:` - Test updates
- `chore:` - Maintenance tasks

Example:
```
feat: Add AI tool support for natural language CRM operations

- Add usableAsTool property
- Implement smart resource detection
- Support $fromAI() parameters

🤖 Generated with Claude Code

Co-Authored-By: Claude <noreply@anthropic.com>
```

## Key Files to Know

### `Insyte.node.ts`

Main node class implementing `INodeType`:
- `description` - Node metadata and properties
- `methods.loadOptions` - Dynamic option loading
- `execute()` - Main execution logic

**Important sections**:
- Resource selection (lines ~41-90)
- Operation options (lines ~92-140)
- Parameter definitions (lines ~142-400)
- Execute function (lines ~451+)

### `helpers.ts`

Utility functions:
- `buildODataQuery()` - Constructs OData query strings
- `insyteApiRequest()` - Makes authenticated API calls
- `insyteApiRequestAllItems()` - Handles pagination
- `parseAIQuery()` - AI natural language processing
- `detectResourceFromQuery()` - Resource type detection
- `detectOperationFromQuery()` - Operation detection
- `getResourceProperties()` - Field definitions per resource

### `InsyteApi.credentials.ts`

Authentication configuration:
- API Key field (password type)
- Base URL (default: https://new-api.insyteblinds.com)
- API Version selector (v1/v2)
- Credential test endpoint

## Using Custom Request Feature (v0.5.0+)

The Custom Request resource allows you to make standalone HTTP requests **independent of the Insyte API**. This is perfect for:
- **Insyte web leads integration** - Using provisioned webhook URLs
- **Custom webhooks** - Any external HTTP endpoint
- **Third-party integrations** - Services outside the Insyte API
- **Testing endpoints** - Quick HTTP request testing

### Example: Insyte Web Leads Integration

1. Select **Custom Request** as the resource
2. Choose **POST** as the HTTP method
3. Enter the **complete URL**: `https://your-provisioned-endpoint.insyte.com/webhook/leads`
4. Add request body (JSON):
```json
{
  "firstName": "John",
  "lastName": "Doe",
  "email": "john@example.com",
  "phone": "0412345678",
  "source": "Website Form"
}
```
5. (Optional) Add query parameters:
   - Name: `apiKey`, Value: `your-key-here`
6. (Optional) Add custom headers:
   - Name: `X-Integration-Token`, Value: `secret-token`

### Custom Request Notes

- **No API credentials required** - Works independently
- **Complete URL** - Provide the full URL including protocol and domain
- JSON body is only available for POST, PUT, and PATCH methods
- Query parameters are appended to the URL
- Custom headers can be added for authentication or other purposes
- Default headers: `Accept: application/json`, `Content-Type: application/json`

## Common Tasks

### Adding a New Resource

1. Add resource to options in `Insyte.node.ts`:
```typescript
{
  name: 'New Resource',
  value: 'newResource',
  description: 'Description',
}
```

2. Add to `resourceMap`:
```typescript
const resourceMap = {
  // ...
  newResource: '/NewResources',
};
```

3. Add field definitions in `getResourceProperties()` in `helpers.ts`

4. Add detection pattern in `detectResourceFromQuery()`

### Adding a New Operation

1. Add operation option:
```typescript
{
  name: 'New Operation',
  value: 'newOp',
  description: 'Description',
  action: 'Action description',
}
```

2. Implement in `execute()` function:
```typescript
if (operation === 'newOp') {
  // Implementation
}
```

### Updating AI Detection

Modify patterns in `helpers.ts`:
```typescript
const patterns: { [key: string]: RegExp } = {
  contact: /contact|person|customer|client|new_keyword/i,
  // ...
};
```

## Troubleshooting

### Build Errors

- Check TypeScript version compatibility
- Ensure `skipLibCheck: true` in `tsconfig.json`
- Run `npm install` to update dependencies

### Runtime Errors

- Verify API credentials are correct
- Check API base URL and version
- Ensure endpoint paths match API specification
- Review OData filter syntax

### AI Tool Issues

- Confirm `usableAsTool: true` is set
- Check environment variable: `N8N_COMMUNITY_PACKAGES_ALLOW_TOOL_USAGE=true`
- Verify node is connected to AI Agent's tool port
- Test AI query patterns in `parseAIQuery()`

## Resources

### Documentation
- [n8n Node Development](https://docs.n8n.io/integrations/creating-nodes/)
- [n8n AI Tools](https://docs.n8n.io/integrations/creating-nodes/build/reference/ai-tool/)
- [Insyte API Swagger](https://new-api.insyteblinds.com/swagger/index.html)

### Tools
- [n8n-nodes-starter](https://github.com/n8n-io/n8n-nodes-starter)
- [@n8n/node-cli](https://www.npmjs.com/package/@n8n/node-cli)
- [TypeScript](https://www.typescriptlang.org/)

## Maintenance Notes

- Keep dependencies updated regularly
- Test with latest n8n version
- Monitor API changes in Swagger documentation
- Update AI patterns based on user feedback
- Maintain backward compatibility when possible

## Contact & Support

- **Developer**: Jeremy Dawes (jeremy@jezweb.net)
- **Organization**: Jezweb
- **Issues**: https://github.com/jezweb/n8n-nodes-insyte/issues
- **License**: MIT

---

**Remember**: This is a community node. Always test thoroughly before publishing updates.