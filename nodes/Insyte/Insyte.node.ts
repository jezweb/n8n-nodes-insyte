import {
  IExecuteFunctions,
  IDataObject,
  ILoadOptionsFunctions,
  INodeExecutionData,
  INodePropertyOptions,
  INodeType,
  INodeTypeDescription,
} from 'n8n-workflow';

import {
  insyteApiRequest,
  insyteApiRequestAllItems,
  buildODataQuery,
  IODataParams,
  getResourceProperties,
  parseAIQuery,
} from './helpers';

export class Insyte implements INodeType {
  description: INodeTypeDescription = {
    displayName: 'Insyte CRM',
    name: 'insyte',
    icon: 'file:insyte.svg',
    group: ['transform'],
    version: 1,
    subtitle: '={{$parameter["operation"] + ": " + $parameter["resource"]}}',
    description: 'Interact with Insyte CRM API for Window Furnishings Industry',
    defaults: {
      name: 'Insyte CRM',
    },
    inputs: ['main'],
    outputs: ['main'],
    usableAsTool: true,
    credentials: [
      {
        name: 'insyteApi',
        required: true,
      },
    ],
    properties: [
      // Resource Selection
      {
        displayName: 'Resource',
        name: 'resource',
        type: 'options',
        noDataExpression: true,
        options: [
          {
            name: 'AI Mode',
            value: 'ai',
            description: 'AI-driven resource selection based on context',
          },
          {
            name: 'Activity',
            value: 'activity',
            description: 'Manage activities and tasks',
          },
          {
            name: 'Company',
            value: 'company',
            description: 'Manage companies',
          },
          {
            name: 'Contact',
            value: 'contact',
            description: 'Manage contacts',
          },
          {
            name: 'Invoice',
            value: 'invoice',
            description: 'Manage invoices',
          },
          {
            name: 'Job',
            value: 'job',
            description: 'Manage jobs',
          },
          {
            name: 'Opportunity',
            value: 'opportunity',
            description: 'Manage opportunities',
          },
          {
            name: 'Payment',
            value: 'payment',
            description: 'Manage payments',
          },
          {
            name: 'Live Diary',
            value: 'liveDiary',
            description: 'Check availability and book sales appointments for leads',
          },
        ],
        default: 'contact',
      },

      // AI Mode Operations
      {
        displayName: 'AI Query',
        name: 'aiQuery',
        type: 'string',
        default: '={{ $fromAI("query", "Natural language query for CRM operation") }}',
        placeholder: 'e.g., Find all contacts in NSW, Create new invoice for John Doe',
        description: 'Natural language description of what you want to do',
        displayOptions: {
          show: {
            resource: ['ai'],
          },
        },
      },

      // Operations for standard resources
      {
        displayName: 'Operation',
        name: 'operation',
        type: 'options',
        noDataExpression: true,
        displayOptions: {
          show: {
            resource: [
              'activity',
              'company',
              'contact',
              'invoice',
              'job',
              'opportunity',
              'payment',
            ],
          },
        },
        options: [
          {
            name: 'Search',
            value: 'search',
            description: 'Search for records using natural language or filters',
            action: 'Search CRM records',
          },
          {
            name: 'Create',
            value: 'create',
            description: 'Create a new contact, company, job, or other record',
            action: 'Create a CRM record',
          },
          {
            name: 'Delete',
            value: 'delete',
            description: 'Delete a record by ID',
            action: 'Delete a CRM record',
          },
          {
            name: 'Get',
            value: 'get',
            description: 'Get a specific record by ID',
            action: 'Get a CRM record',
          },
          {
            name: 'Get Many',
            value: 'getAll',
            description: 'Get many records',
            action: 'Get many records',
          },
          {
            name: 'Update',
            value: 'update',
            description: 'Update a record',
            action: 'Update a record',
          },
        ],
        default: 'getAll',
      },

      // Operations for Live Diary
      {
        displayName: 'Operation',
        name: 'operation',
        type: 'options',
        noDataExpression: true,
        displayOptions: {
          show: {
            resource: ['liveDiary'],
          },
        },
        options: [
          {
            name: 'Check Availability',
            value: 'checkAvailability',
            description: 'Check available appointment slots for sales meetings',
            action: 'Check availability for appointments',
          },
          {
            name: 'Book Lead',
            value: 'bookLead',
            description: 'Book a sales appointment for a new lead',
            action: 'Book lead appointment',
          },
        ],
        default: 'checkAvailability',
      },

      // ID field for single operations
      {
        displayName: 'ID',
        name: 'id',
        type: 'string',
        required: true,
        displayOptions: {
          show: {
            operation: ['get', 'delete', 'update'],
          },
        },
        default: '',
        description: 'The ID of the record',
      },

      // Return All for getAll
      {
        displayName: 'Return All',
        name: 'returnAll',
        type: 'boolean',
        displayOptions: {
          show: {
            operation: ['getAll'],
          },
        },
        default: false,
        description: 'Whether to return all results or only up to a given limit',
      },

      {
        displayName: 'Limit',
        name: 'limit',
        type: 'number',
        displayOptions: {
          show: {
            operation: ['getAll'],
            returnAll: [false],
          },
        },
        typeOptions: {
          minValue: 1,
          maxValue: 500,
        },
        default: 50,
        description: 'Max number of results to return',
      },

      // Additional Fields
      {
        displayName: 'Additional Fields',
        name: 'additionalFields',
        type: 'collection',
        placeholder: 'Add Field',
        default: {},
        displayOptions: {
          show: {
            operation: ['getAll', 'create', 'update'],
          },
        },
        options: [
          // OData Options for getAll
          {
            displayName: 'Fields to Select',
            name: 'select',
            type: 'multiOptions',
            typeOptions: {
              loadOptionsMethod: 'getResourceFields',
              loadOptionsDependsOn: ['resource'],
            },
            displayOptions: {
              show: {
                '/operation': ['getAll'],
              },
            },
            default: [],
            description: 'Fields to include in the response',
          },
          {
            displayName: 'Filter',
            name: 'filter',
            type: 'string',
            displayOptions: {
              show: {
                '/operation': ['getAll'],
              },
            },
            default: '',
            placeholder: 'e.g., FirstName eq \'John\'',
            description: 'OData filter expression',
          },
          {
            displayName: 'Order By',
            name: 'orderby',
            type: 'string',
            displayOptions: {
              show: {
                '/operation': ['getAll'],
              },
            },
            default: '',
            placeholder: 'e.g., LastName desc',
            description: 'OData orderby expression',
          },
          {
            displayName: 'Expand',
            name: 'expand',
            type: 'string',
            displayOptions: {
              show: {
                '/operation': ['getAll'],
              },
            },
            default: '',
            placeholder: 'e.g., Company',
            description: 'Related entities to include',
          },
        ],
      },

      // Update/Create Fields - Dynamic based on resource
      {
        displayName: 'Fields',
        name: 'fields',
        type: 'collection',
        placeholder: 'Add Field',
        default: {},
        displayOptions: {
          show: {
            operation: ['create', 'update'],
            resource: ['contact'],
          },
        },
        options: [
          {
            displayName: 'First Name',
            name: 'FirstName',
            type: 'string',
            default: '',
          },
          {
            displayName: 'Last Name',
            name: 'LastName',
            type: 'string',
            default: '',
          },
          {
            displayName: 'Email',
            name: 'Email',
            type: 'string',
            placeholder: 'name@email.com',
            default: '',
          },
          {
            displayName: 'Phone',
            name: 'Phone',
            type: 'string',
            default: '',
          },
          {
            displayName: 'Mobile',
            name: 'Mobile',
            type: 'string',
            default: '',
          },
          {
            displayName: 'Company ID',
            name: 'CompanyID',
            type: 'number',
            default: 0,
          },
          {
            displayName: 'Address',
            name: 'Address',
            type: 'string',
            default: '',
          },
          {
            displayName: 'City',
            name: 'City',
            type: 'string',
            default: '',
          },
          {
            displayName: 'State',
            name: 'State',
            type: 'string',
            default: '',
          },
          {
            displayName: 'Postcode',
            name: 'Postcode',
            type: 'string',
            default: '',
          },
        ],
      },

      // Company Fields
      {
        displayName: 'Fields',
        name: 'fields',
        type: 'collection',
        placeholder: 'Add Field',
        default: {},
        displayOptions: {
          show: {
            operation: ['create', 'update'],
            resource: ['company'],
          },
        },
        options: [
          {
            displayName: 'Name',
            name: 'Name',
            type: 'string',
            default: '',
          },
          {
            displayName: 'Trading Name',
            name: 'TradingName',
            type: 'string',
            default: '',
          },
          {
            displayName: 'ABN',
            name: 'ABN',
            type: 'string',
            default: '',
          },
          {
            displayName: 'Email',
            name: 'Email',
            type: 'string',
            placeholder: 'company@email.com',
            default: '',
          },
          {
            displayName: 'Phone',
            name: 'Phone',
            type: 'string',
            default: '',
          },
          {
            displayName: 'Address',
            name: 'Address',
            type: 'string',
            default: '',
          },
          {
            displayName: 'City',
            name: 'City',
            type: 'string',
            default: '',
          },
          {
            displayName: 'State',
            name: 'State',
            type: 'string',
            default: '',
          },
          {
            displayName: 'Postcode',
            name: 'Postcode',
            type: 'string',
            default: '',
          },
        ],
      },

      // ========================================
      // Live Diary - Check Availability Parameters
      // ========================================
      {
        displayName: 'Latitude',
        name: 'latitude',
        type: 'number',
        required: true,
        displayOptions: {
          show: {
            resource: ['liveDiary'],
            operation: ['checkAvailability', 'bookLead'],
          },
        },
        default: 0,
        description: 'Latitude of the appointment location (required to determine timezone)',
      },
      {
        displayName: 'Longitude',
        name: 'longitude',
        type: 'number',
        required: true,
        displayOptions: {
          show: {
            resource: ['liveDiary'],
            operation: ['checkAvailability', 'bookLead'],
          },
        },
        default: 0,
        description: 'Longitude of the appointment location (required to determine timezone)',
      },
      {
        displayName: 'From Date',
        name: 'fromDate',
        type: 'dateTime',
        required: true,
        displayOptions: {
          show: {
            resource: ['liveDiary'],
            operation: ['checkAvailability'],
          },
        },
        default: '',
        description: 'Start date for availability search',
      },
      {
        displayName: 'To Date',
        name: 'toDate',
        type: 'dateTime',
        required: true,
        displayOptions: {
          show: {
            resource: ['liveDiary'],
            operation: ['checkAvailability'],
          },
        },
        default: '',
        description: 'End date for availability search',
      },
      {
        displayName: 'Appointment Duration (Minutes)',
        name: 'appointmentMinutes',
        type: 'number',
        required: true,
        displayOptions: {
          show: {
            resource: ['liveDiary'],
            operation: ['checkAvailability'],
          },
        },
        default: 60,
        description: 'Duration of the appointment in minutes',
      },
      {
        displayName: 'Additional Options',
        name: 'availabilityOptions',
        type: 'collection',
        placeholder: 'Add Option',
        default: {},
        displayOptions: {
          show: {
            resource: ['liveDiary'],
            operation: ['checkAvailability'],
          },
        },
        options: [
          {
            displayName: 'Filter By Roster',
            name: 'filterByRoster',
            type: 'boolean',
            default: true,
            description: 'Whether to check only rostered times (true) or 9am-5pm (false)',
          },
          {
            displayName: 'Filter By Skills',
            name: 'filterBySkills',
            type: 'boolean',
            default: false,
            description: 'Whether to match sales rep skills to products',
          },
          {
            displayName: 'Products Of Interest',
            name: 'productsOfInterests',
            type: 'string',
            default: '',
            placeholder: '1,2,3',
            description: 'Comma-separated list of product IDs',
          },
          {
            displayName: 'Postcode',
            name: 'postcode',
            type: 'string',
            default: '',
            description: 'Filter by postcode',
          },
          {
            displayName: 'State',
            name: 'state',
            type: 'string',
            default: '',
            description: 'Filter by state (e.g., NSW, VIC)',
          },
          {
            displayName: 'City',
            name: 'city',
            type: 'string',
            default: '',
            description: 'Filter by city',
          },
        ],
      },

      // ========================================
      // Live Diary - Book Lead Parameters
      // ========================================
      {
        displayName: 'Slot Key',
        name: 'slotKey',
        type: 'string',
        required: true,
        displayOptions: {
          show: {
            resource: ['liveDiary'],
            operation: ['bookLead'],
          },
        },
        default: '',
        description: 'The SlotKey returned from the availability request',
      },
      {
        displayName: 'First Name',
        name: 'firstName',
        type: 'string',
        required: true,
        displayOptions: {
          show: {
            resource: ['liveDiary'],
            operation: ['bookLead'],
          },
        },
        default: '',
        description: 'Lead first name',
      },
      {
        displayName: 'Last Name',
        name: 'lastName',
        type: 'string',
        required: true,
        displayOptions: {
          show: {
            resource: ['liveDiary'],
            operation: ['bookLead'],
          },
        },
        default: '',
        description: 'Lead last name',
      },
      {
        displayName: 'Address',
        name: 'address',
        type: 'string',
        required: true,
        displayOptions: {
          show: {
            resource: ['liveDiary'],
            operation: ['bookLead'],
          },
        },
        default: '',
        description: 'Lead address',
      },
      {
        displayName: 'Additional Lead Details',
        name: 'leadDetails',
        type: 'collection',
        placeholder: 'Add Detail',
        default: {},
        displayOptions: {
          show: {
            resource: ['liveDiary'],
            operation: ['bookLead'],
          },
        },
        options: [
          {
            displayName: 'Email',
            name: 'email',
            type: 'string',
            default: '',
            placeholder: 'lead@example.com',
            description: 'Lead email address',
          },
          {
            displayName: 'Phone Number',
            name: 'phoneNumber',
            type: 'string',
            default: '',
            description: 'Lead phone number',
          },
          {
            displayName: 'Mobile Number',
            name: 'mobileNumber',
            type: 'string',
            default: '',
            description: 'Lead mobile number',
          },
          {
            displayName: 'Marketing Opt Out',
            name: 'marketingOptOut',
            type: 'boolean',
            default: false,
            description: 'Whether lead has opted out of marketing',
          },
          {
            displayName: 'Lead Source ID',
            name: 'leadSourceID',
            type: 'number',
            default: undefined,
            description: 'Lead source ID to track where the lead came from',
          },
          {
            displayName: 'Duration Minutes',
            name: 'durationMins',
            type: 'number',
            default: 60,
            description: 'Appointment duration in minutes',
          },
          {
            displayName: 'Estimated Travel Minutes',
            name: 'estimatedTravelMins',
            type: 'number',
            default: 20,
            description: 'Travel time in minutes (used for utilization calculation)',
          },
        ],
      },
    ],
  };

  methods = {
    loadOptions: {
      async getResourceFields(this: ILoadOptionsFunctions): Promise<INodePropertyOptions[]> {
        const resource = this.getCurrentNodeParameter('resource') as string;
        const fields = getResourceProperties(resource);
        return fields.map(field => ({
          name: field.name as string,
          value: field.value as string,
        }));
      },
    },
  };

  async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
    const items = this.getInputData();
    const returnData: IDataObject[] = [];
    let resource = this.getNodeParameter('resource', 0) as string;
    let operation = this.getNodeParameter('operation', 0, '') as string;

    // Handle AI mode
    if (resource === 'ai') {
      const aiQuery = this.getNodeParameter('aiQuery', 0) as string;
      const aiResult = parseAIQuery(aiQuery);
      resource = aiResult.resource;
      operation = aiResult.operation;

      // Store AI parameters for later use
      const aiParameters = aiResult.parameters;

      // Log AI interpretation for debugging
      returnData.push({
        _aiInterpretation: {
          query: aiQuery,
          detectedResource: resource,
          detectedOperation: operation,
          extractedParameters: aiParameters,
        },
      });
    }

    // Handle Live Diary operations separately
    if (resource === 'liveDiary') {
      for (let i = 0; i < items.length; i++) {
        try {
          if (operation === 'checkAvailability') {
            const latitude = this.getNodeParameter('latitude', i) as number;
            const longitude = this.getNodeParameter('longitude', i) as number;
            const fromDate = this.getNodeParameter('fromDate', i) as string;
            const toDate = this.getNodeParameter('toDate', i) as string;
            const appointmentMinutes = this.getNodeParameter('appointmentMinutes', i) as number;
            const options = this.getNodeParameter('availabilityOptions', i) as IDataObject;

            const body: IDataObject = {
              latitude,
              longitude,
              fromDate,
              toDate,
              appointmentMinutes,
            };

            // Add optional fields
            if (options.filterByRoster !== undefined) {
              body.filterByRoster = options.filterByRoster;
            }
            if (options.filterBySkills !== undefined) {
              body.filterBySkills = options.filterBySkills;
            }
            if (options.productsOfInterests) {
              const products = (options.productsOfInterests as string).split(',').map(p => parseInt(p.trim(), 10));
              body.productsOfInterests = products;
            }
            if (options.postcode || options.state || options.city) {
              body.areaFilter = {
                postcode: options.postcode || null,
                state: options.state || null,
                city: options.city || null,
              };
            }

            const responseData = await insyteApiRequest.call(
              this,
              'POST',
              '/LiveDiary/Sales/Availability',
              body,
            );
            returnData.push(responseData);
          }

          if (operation === 'bookLead') {
            const slotKey = this.getNodeParameter('slotKey', i) as string;
            const firstName = this.getNodeParameter('firstName', i) as string;
            const lastName = this.getNodeParameter('lastName', i) as string;
            const address = this.getNodeParameter('address', i) as string;
            const leadDetails = this.getNodeParameter('leadDetails', i) as IDataObject;

            const body: IDataObject = {
              slotKey,
              lead: {
                firstName,
                lastName,
                address,
                email: leadDetails.email || null,
                phoneNumber: leadDetails.phoneNumber || null,
                mobileNumber: leadDetails.mobileNumber || null,
                marketingOptOut: leadDetails.marketingOptOut || false,
              },
            };

            // Add optional top-level fields
            if (leadDetails.leadSourceID !== undefined) {
              body.leadSourceID = leadDetails.leadSourceID;
            }
            if (leadDetails.durationMins !== undefined) {
              body.durationMins = leadDetails.durationMins;
            }
            if (leadDetails.estimatedTravelMins !== undefined) {
              body.estimatedTravelMins = leadDetails.estimatedTravelMins;
            }

            const responseData = await insyteApiRequest.call(
              this,
              'POST',
              '/LiveDiary/Sales/BookLead',
              body,
            );
            returnData.push(responseData);
          }
        } catch (error) {
          if (this.continueOnFail()) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            returnData.push({ error: errorMessage });
            continue;
          }
          throw error;
        }
      }
      return [this.helpers.returnJsonArray(returnData)];
    }

    // Map resource to API endpoint
    const resourceMap: { [key: string]: string } = {
      activity: '/Activities',
      company: '/Companies',
      contact: '/Contacts',
      invoice: '/Invoices',
      job: '/Jobs',
      opportunity: '/Opportunities',
      payment: '/Payments',
    };

    const endpoint = resourceMap[resource];

    for (let i = 0; i < items.length; i++) {
      try {
        if (operation === 'getAll' || operation === 'search') {
          const returnAll = this.getNodeParameter('returnAll', i) as boolean;
          const additionalFields = this.getNodeParameter('additionalFields', i) as IDataObject;

          const queryParams: IODataParams = {};

          if (additionalFields.select) {
            queryParams.select = (additionalFields.select as string[]).join(',');
          }

          if (additionalFields.filter) {
            queryParams.filter = additionalFields.filter as string;
          }

          if (additionalFields.orderby) {
            queryParams.orderby = additionalFields.orderby as string;
          }

          if (additionalFields.expand) {
            queryParams.expand = additionalFields.expand as string;
          }

          // Apply AI-extracted parameters if in AI mode
          if (resource === 'ai' && returnData.length > 0) {
            const aiParams = returnData[0]._aiInterpretation as any;
            if (aiParams?.extractedParameters?.filter) {
              queryParams.filter = aiParams.extractedParameters.filter as string;
            }
          }

          if (returnAll) {
            const responseData = await insyteApiRequestAllItems.call(
              this,
              'value',
              'GET',
              endpoint,
              {},
              queryParams,
            );
            returnData.push(...responseData);
          } else {
            const limit = this.getNodeParameter('limit', i) as number;
            queryParams.top = limit;

            const qs = buildODataQuery(queryParams);
            const responseData = await insyteApiRequest.call(
              this,
              'GET',
              `${endpoint}${qs}`,
            );

            if (responseData.value && Array.isArray(responseData.value)) {
              returnData.push(...responseData.value);
            } else if (Array.isArray(responseData)) {
              returnData.push(...responseData);
            } else {
              returnData.push(responseData);
            }
          }
        }

        if (operation === 'get') {
          const id = this.getNodeParameter('id', i) as string;
          const responseData = await insyteApiRequest.call(
            this,
            'GET',
            `${endpoint}(${id})`,
          );
          returnData.push(responseData);
        }

        if (operation === 'create') {
          const fields = this.getNodeParameter('fields', i) as IDataObject;
          const responseData = await insyteApiRequest.call(
            this,
            'POST',
            endpoint,
            fields,
          );
          returnData.push(responseData);
        }

        if (operation === 'update') {
          const id = this.getNodeParameter('id', i) as string;
          const fields = this.getNodeParameter('fields', i) as IDataObject;
          const responseData = await insyteApiRequest.call(
            this,
            'PATCH',
            `${endpoint}(${id})`,
            fields,
          );
          returnData.push(responseData);
        }

        if (operation === 'delete') {
          const id = this.getNodeParameter('id', i) as string;
          await insyteApiRequest.call(
            this,
            'DELETE',
            `${endpoint}(${id})`,
          );
          returnData.push({ success: true, id });
        }
      } catch (error) {
        if (this.continueOnFail()) {
          const errorMessage = error instanceof Error ? error.message : String(error);
          returnData.push({ error: errorMessage });
          continue;
        }
        throw error;
      }
    }

    return [this.helpers.returnJsonArray(returnData)];
  }
}