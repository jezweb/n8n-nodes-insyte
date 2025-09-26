import {
  IAuthenticateGeneric,
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
      displayName: 'API Key',
      name: 'apiKey',
      type: 'string',
      typeOptions: {
        password: true,
      },
      default: '',
      required: true,
      description: 'The API key for authenticating with the Insyte API',
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
          name: 'Version 2',
          value: 'v2',
        },
        {
          name: 'Version 1',
          value: 'v1',
        },
      ],
      default: 'v2',
      description: 'The API version to use',
    },
  ];

  authenticate: IAuthenticateGeneric = {
    type: 'generic',
    properties: {
      headers: {
        Authorization: '=Bearer {{$credentials.apiKey}}',
      },
    },
  };

  test: ICredentialTestRequest = {
    request: {
      baseURL: '={{$credentials.baseUrl}}',
      url: '/{{$credentials.apiVersion}}/Users',
      method: 'GET',
    },
  };
}