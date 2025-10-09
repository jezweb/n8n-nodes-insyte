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
      displayName: 'Allowed Domains',
      name: 'allowedDomains',
      type: 'string',
      default: 'new-api.insyteblinds.com',
      description: 'Comma-separated list of allowed domains for HTTP requests',
      placeholder: 'new-api.insyteblinds.com,api.example.com',
    },
  ];

  authenticate: IAuthenticateGeneric = {
    type: 'generic',
    properties: {
      headers: {
        Authorization: '=Basic {{ btoa($credentials.username + ":" + $credentials.password) }}',
      },
    },
  };

  test: ICredentialTestRequest = {
    request: {
      baseURL: '={{$credentials.baseUrl}}',
      url: '/v2/Users',
      method: 'GET',
    },
  };
}