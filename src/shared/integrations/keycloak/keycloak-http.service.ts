import {
  BadGatewayException,
  Injectable,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios, { type AxiosRequestConfig, type AxiosResponse } from 'axios';
import { AxiosService } from '../axios/axios.service';

@Injectable()
export class KeycloakHttpService {
  constructor(
    private readonly config: ConfigService,
    private readonly axiosService: AxiosService,
  ) {}

  async request<T>(config: AxiosRequestConfig): Promise<AxiosResponse<T>> {
    try {
      return await this.client().request<T>(config);
    } catch (error) {
      if (axios.isAxiosError(error) && error.response) {
        throw new BadGatewayException(
          `Keycloak request failed with status ${error.response.status}`,
        );
      }
      throw new ServiceUnavailableException('Keycloak is unavailable');
    }
  }

  private client() {
    const baseURL = this.config.get<string>('auth.keycloakAuthServerUrl');
    if (!baseURL) {
      throw new ServiceUnavailableException('Keycloak is not configured');
    }
    return this.axiosService.create({
      key: 'keycloak',
      config: { baseURL: baseURL.replace(/\/$/, '') },
    });
  }
}
