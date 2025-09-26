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
        ],
        default: 'contact',
      },

      // Operations
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
            name: 'Create',
            value: 'create',
            description: 'Create a new record',
            action: 'Create a record',
          },
          {
            name: 'Delete',
            value: 'delete',
            description: 'Delete a record',
            action: 'Delete a record',
          },
          {
            name: 'Get',
            value: 'get',
            description: 'Get a record by ID',
            action: 'Get a record',
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
    const resource = this.getNodeParameter('resource', 0) as string;
    const operation = this.getNodeParameter('operation', 0) as string;

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
        if (operation === 'getAll') {
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