import {Adapter} from 'js-data-adapter'

interface IDict {
  [key: string]: any;
}
interface IBaseAdapter extends IDict {
  debug?: boolean,
  raw?: boolean
}
interface IBaseRedisAdapter extends IBaseAdapter {
  host?: string
  port?: number
}
export class RedisAdapter extends Adapter {
  static extend(instanceProps?: IDict, classProps?: IDict): typeof RedisAdapter
  constructor(opts?: IBaseRedisAdapter)
}
export interface version {
  full: string
  minor: string
  major: string
  patch: string
  alpha: string | boolean
  beta: string | boolean
}