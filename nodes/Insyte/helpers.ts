import {
  IExecuteFunctions,
  ILoadOptionsFunctions,
  IDataObject,
  IHttpRequestOptions,
  JsonObject,
  NodeApiError,
} from 'n8n-workflow';

export interface IODataParams {
  filter?: string;
  select?: string;
  expand?: string;
  orderby?: string;
  top?: number;
  skip?: number;
}

export interface IAIQueryResult {
  resource: string;
  operation: string;
  parameters: IDataObject;
}

/**
 * Detect resource type from natural language query
 */
export function detectResourceFromQuery(query: string): string {
  const patterns: { [key: string]: RegExp } = {
    liveDiary: /book.{0,20}appointment|schedule.{0,20}meeting|check.{0,20}availability|available.{0,20}slot|appointment.{0,20}time|sales.{0,20}appointment/i,
    contact: /contact|person|customer|client|lead/i,
    company: /company|business|organization|firm|corp/i,
    job: /job|project|work|task/i,
    invoice: /invoice|bill|payment due|billing/i,
    opportunity: /opportunity|deal|prospect|sale/i,
    activity: /activity|task|todo|reminder|follow.?up/i,
    payment: /payment|receipt|transaction|paid/i,
  };

  for (const [resource, pattern] of Object.entries(patterns)) {
    if (pattern.test(query)) return resource;
  }
  return 'contact'; // default to contact
}

/**
 * Detect operation type from natural language query
 */
export function detectOperationFromQuery(query: string): string {
  const patterns: { [key: string]: RegExp } = {
    checkAvailability: /check.{0,20}availability|available.{0,20}time|when.{0,20}available|find.{0,20}slot|available.{0,20}slot/i,
    bookLead: /book.{0,20}appointment|schedule.{0,20}meeting|book.{0,20}lead|create.{0,20}appointment/i,
    search: /find|search|look for|get all|list|show|retrieve/i,
    get: /get|fetch|load|read/i,
  };

  for (const [operation, pattern] of Object.entries(patterns)) {
    if (pattern.test(query)) return operation;
  }
  return 'search'; // default to search
}

/**
 * Parse natural language query into structured parameters
 */
export function parseAIQuery(query: string): IAIQueryResult {
  const resource = detectResourceFromQuery(query);
  const operation = detectOperationFromQuery(query);
  const parameters: IDataObject = {};

  // Extract common patterns
  const nameMatch = query.match(/(?:named?|called)\s+["']?([^"']+)["']?/i);
  if (nameMatch) {
    parameters.name = nameMatch[1].trim();
  }

  // Extract location patterns
  const locationMatch = query.match(/(?:in|from|at)\s+([A-Z][A-Za-z\s]+)/i);
  if (locationMatch) {
    parameters.location = locationMatch[1].trim();
  }

  // Extract email
  const emailMatch = query.match(/([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/i);
  if (emailMatch) {
    parameters.email = emailMatch[1];
  }

  // Extract date patterns
  const datePatterns = [
    /(?:from|since|after)\s+(\d{4}-\d{2}-\d{2}|today|yesterday|last\s+\w+)/i,
    /(?:before|until|by)\s+(\d{4}-\d{2}-\d{2}|today|tomorrow|next\s+\w+)/i,
  ];

  for (const pattern of datePatterns) {
    const match = query.match(pattern);
    if (match) {
      parameters.dateFilter = match[1];
    }
  }

  // Build filter string for search operations
  if (operation === 'search' || operation === 'getAll') {
    const filters = [];
    if (parameters.name) {
      if (resource === 'contact') {
        filters.push(`contains(FirstName, '${parameters.name}') or contains(LastName, '${parameters.name}')`);
      } else {
        filters.push(`contains(Name, '${parameters.name}')`);
      }
    }
    if (parameters.location) {
      filters.push(`State eq '${parameters.location}' or City eq '${parameters.location}'`);
    }
    if (parameters.email) {
      filters.push(`Email eq '${parameters.email}'`);
    }

    if (filters.length > 0) {
      parameters.filter = filters.join(' and ');
    }
  }

  return {
    resource,
    operation,
    parameters,
  };
}

/**
 * Build OData query string from parameters
 */
export function buildODataQuery(params: IODataParams): string {
  const query = [];
  if (params.filter) query.push(`$filter=${encodeURIComponent(params.filter)}`);
  if (params.select) query.push(`$select=${encodeURIComponent(params.select)}`);
  if (params.expand) query.push(`$expand=${encodeURIComponent(params.expand)}`);
  if (params.orderby) query.push(`$orderby=${encodeURIComponent(params.orderby)}`);
  if (params.top) query.push(`$top=${params.top}`);
  if (params.skip) query.push(`$skip=${params.skip}`);
  return query.length ? `?${query.join('&')}` : '';
}

/**
 * Make an authenticated API request to Insyte
 */
export async function insyteApiRequest(
  this: IExecuteFunctions | ILoadOptionsFunctions,
  method: string,
  endpoint: string,
  body?: IDataObject,
  qs?: IDataObject,
  customHeaders?: IDataObject,
): Promise<any> {
  const credentials = await this.getCredentials('insyteApi') as IDataObject;
  const baseUrl = (credentials.baseUrl as string) || 'https://new-api.insyteblinds.com';
  const apiVersion = (credentials.apiVersion as string) || 'v2';

  // Create Basic Auth header
  const username = credentials.username as string;
  const password = credentials.password as string;
  const authString = Buffer.from(`${username}:${password}`).toString('base64');

  const headers: IDataObject = {
    'Accept': 'application/json',
    'Content-Type': 'application/json',
    'Authorization': `Basic ${authString}`,
  };

  // Merge custom headers if provided
  if (customHeaders && Object.keys(customHeaders).length > 0) {
    Object.assign(headers, customHeaders);
  }

  const options: IHttpRequestOptions = {
    method: method as any,
    url: `${baseUrl}/${apiVersion}${endpoint}`,
    headers,
    json: true,
  };

  if (body && Object.keys(body).length > 0) {
    options.body = body;
  }

  if (qs && Object.keys(qs).length > 0) {
    options.qs = qs;
  }

  try {
    const response = await this.helpers.httpRequest(options);
    return response;
  } catch (error) {
    throw new NodeApiError(this.getNode(), error as JsonObject);
  }
}

/**
 * Make an authenticated API request with pagination
 */
export async function insyteApiRequestAllItems(
  this: IExecuteFunctions,
  propertyName: string,
  method: string,
  endpoint: string,
  body?: IDataObject,
  query?: IODataParams,
): Promise<any> {
  const returnData: IDataObject[] = [];
  let responseData;

  const queryParams = query || {};
  queryParams.skip = 0;
  queryParams.top = queryParams.top || 100;

  do {
    const qs = buildODataQuery(queryParams);
    responseData = await insyteApiRequest.call(this, method, `${endpoint}${qs}`, body);

    if (responseData.value && Array.isArray(responseData.value)) {
      returnData.push(...responseData.value);
      queryParams.skip! += queryParams.top!;
    } else if (Array.isArray(responseData)) {
      returnData.push(...responseData);
      queryParams.skip! += queryParams.top!;

      // If we got less than requested, we've reached the end
      if (responseData.length < queryParams.top!) {
        break;
      }
    } else {
      break;
    }
  } while (responseData.value?.length === queryParams.top || responseData.length === queryParams.top);

  return returnData;
}

/**
 * Get resource properties for dynamic options
 */
/**
 * Make a standalone HTTP request (without API authentication)
 * Used for custom integrations like Insyte web leads
 * Mimics wp_remote_post behavior: sends body as JSON string
 */
export async function customHttpRequest(
  this: IExecuteFunctions,
  method: string,
  url: string,
  body?: IDataObject,
  qs?: IDataObject,
  customHeaders?: IDataObject,
): Promise<any> {
  const headers: IDataObject = {
    'Accept': 'application/json',
    'Content-Type': 'application/json',
  };

  // Merge custom headers if provided
  if (customHeaders && Object.keys(customHeaders).length > 0) {
    Object.assign(headers, customHeaders);
  }

  const options: IHttpRequestOptions = {
    method: method as any,
    url,
    headers,
    json: false, // Don't auto-parse JSON, we're sending raw string
  };

  // Convert body to JSON string (like wp_json_encode in WordPress)
  if (body && Object.keys(body).length > 0) {
    options.body = JSON.stringify(body);
  }

  if (qs && Object.keys(qs).length > 0) {
    options.qs = qs;
  }

  try {
    const response = await this.helpers.httpRequest(options);
    // Parse response as JSON if it's a string
    if (typeof response === 'string') {
      try {
        return JSON.parse(response);
      } catch {
        return response;
      }
    }
    return response;
  } catch (error) {
    throw new NodeApiError(this.getNode(), error as JsonObject);
  }
}

/**
 * Get resource properties for dynamic options
 */
export function getResourceProperties(resource: string): IDataObject[] {
  const properties: { [key: string]: IDataObject[] } = {
    contact: [
      { name: 'ID', value: 'ID' },
      { name: 'First Name', value: 'FirstName' },
      { name: 'Last Name', value: 'LastName' },
      { name: 'Email', value: 'Email' },
      { name: 'Mobile', value: 'Mobile' },
      { name: 'Phone', value: 'Phone' },
      { name: 'Company ID', value: 'CompanyID' },
      { name: 'Address', value: 'Address' },
      { name: 'City', value: 'City' },
      { name: 'State', value: 'State' },
      { name: 'Postcode', value: 'Postcode' },
    ],
    company: [
      { name: 'ID', value: 'ID' },
      { name: 'Name', value: 'Name' },
      { name: 'Trading Name', value: 'TradingName' },
      { name: 'ABN', value: 'ABN' },
      { name: 'Email', value: 'Email' },
      { name: 'Phone', value: 'Phone' },
      { name: 'Address', value: 'Address' },
      { name: 'City', value: 'City' },
      { name: 'State', value: 'State' },
      { name: 'Postcode', value: 'Postcode' },
    ],
    activity: [
      { name: 'ID', value: 'ID' },
      { name: 'Subject', value: 'Subject' },
      { name: 'Description', value: 'Description' },
      { name: 'Type', value: 'Type' },
      { name: 'Status', value: 'Status' },
      { name: 'Priority', value: 'Priority' },
      { name: 'Due Date', value: 'DueDate' },
      { name: 'Contact ID', value: 'ContactID' },
      { name: 'Company ID', value: 'CompanyID' },
      { name: 'Assigned To', value: 'AssignedTo' },
    ],
    opportunity: [
      { name: 'ID', value: 'ID' },
      { name: 'Name', value: 'Name' },
      { name: 'Description', value: 'Description' },
      { name: 'Stage', value: 'Stage' },
      { name: 'Probability', value: 'Probability' },
      { name: 'Amount', value: 'Amount' },
      { name: 'Close Date', value: 'CloseDate' },
      { name: 'Contact ID', value: 'ContactID' },
      { name: 'Company ID', value: 'CompanyID' },
      { name: 'Owner ID', value: 'OwnerID' },
    ],
    job: [
      { name: 'ID', value: 'ID' },
      { name: 'Job Number', value: 'JobNumber' },
      { name: 'Description', value: 'Description' },
      { name: 'Status', value: 'Status' },
      { name: 'Start Date', value: 'StartDate' },
      { name: 'End Date', value: 'EndDate' },
      { name: 'Total Amount', value: 'TotalAmount' },
      { name: 'Contact ID', value: 'ContactID' },
      { name: 'Company ID', value: 'CompanyID' },
      { name: 'Site Address', value: 'SiteAddress' },
    ],
    invoice: [
      { name: 'ID', value: 'ID' },
      { name: 'Invoice Number', value: 'InvoiceNumber' },
      { name: 'Date', value: 'Date' },
      { name: 'Due Date', value: 'DueDate' },
      { name: 'Status', value: 'Status' },
      { name: 'Total Amount', value: 'TotalAmount' },
      { name: 'Tax Amount', value: 'TaxAmount' },
      { name: 'Contact ID', value: 'ContactID' },
      { name: 'Company ID', value: 'CompanyID' },
      { name: 'Job ID', value: 'JobID' },
    ],
    payment: [
      { name: 'ID', value: 'ID' },
      { name: 'Payment Number', value: 'PaymentNumber' },
      { name: 'Date', value: 'Date' },
      { name: 'Amount', value: 'Amount' },
      { name: 'Method', value: 'Method' },
      { name: 'Reference', value: 'Reference' },
      { name: 'Contact ID', value: 'ContactID' },
      { name: 'Company ID', value: 'CompanyID' },
      { name: 'Invoice ID', value: 'InvoiceID' },
    ],
  };

  return properties[resource] || [];
}