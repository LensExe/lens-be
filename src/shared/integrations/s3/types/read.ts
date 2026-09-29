export interface ReadObjectParams {
  key: string;
}

export interface ListAllParams {
  prefix: string;
}

export type ReadTextParams = ReadObjectParams;
export type ReadJsonParams = ReadObjectParams;
export type ReadBufferParams = ReadObjectParams;
export type ListParams = ReadObjectParams;
