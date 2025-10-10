import {
  ICredentialTestRequest,
  ICredentialType,
  INodeProperties,
} from 'n8n-workflow';

export class InsyteApi implements ICredentialType {
  name = 'insyteApi';
  displayName = 'Insyte API';
  documentationUrl = 'https://new-api.insyteblinds.com/swagger/index.html';
  properties: INodeProperties[] = [
    {
      displayName: 'Username',
      name: 'username',
      type: 'string',
      default: '',
      required: true,
      description: 'The username for authenticating with the Insyte API',
    },
    {
      displayName: 'Password',
      name: 'password',
      type: 'string',
      typeOptions: {
        password: true,
      },
      default: '',
      required: true,
      description: 'The password for authenticating with the Insyte API',
    },
    {
      displayName: 'Base URL',
      name: 'baseUrl',
      type: 'string',
      default: 'https://new-api.insyteblinds.com',
      description: 'The base URL for the Insyte API',
      placeholder: 'https://new-api.insyteblinds.com',
    },
    {
      displayName: 'API Version',
      name: 'apiVersion',
      type: 'options',
      options: [
        {
          name: 'v1',
          value: 'v1',
        },
        {
          name: 'v2',
          value: 'v2',
        },
      ],
      default: 'v2',
      description: 'The API version to use',
    },
  ];

  test: ICredentialTestRequest = {
    request: {
      baseURL: '={{$credentials.baseUrl}}',
      url: '=/{{$credentials.apiVersion || "v2"}}/Users',
      method: 'GET',
    },
  };
}