declare module '@ioc:Rocketseat/Bull' {
  import {
    Queue,
    Processor,
    JobsOptions,
    QueueOptions,
    WorkerOptions,
    Job
  } from 'bullmq'

  export type BullConnectionContract = Exclude<
    QueueOptions['connection'],
    undefined
  >;

  /**
   * A list of typed connections defined in the user land using
   * the contracts file
   */
  export interface BullConnectionsList {}

  /**
   * Define the config properties on this interface and they will appear
   * everywhere.
   */
  export interface BullConfig {
    connection: keyof BullConnectionsList;
    connections: { [P in keyof BullConnectionsList]: BullConnectionsList[P] };
  }

  export interface JobContract<T = any> {
    key: string;
    options?: JobsOptions;
    workerOptions?: WorkerOptions;
    queueOptions?: QueueOptions;
    concurrency?: number;
    handle: Processor;
    boot?: (queue: Queue<T>) => void;
  }

  export interface QueueContract<T = any> extends JobContract<T> {
    bull: Queue<T>;
  }

  export interface BullManagerContract {
    queues: { [key: string]: QueueContract };

    getByKey(key: string): QueueContract;

    add<T>(
      name: string,
      data: T,
      jobOptions?: JobsOptions
    ): Promise<Job<any, any>>;

    remove(name: string, jobId: string): Promise<void>;

    ui(port?: number): void;

    shutdown(): Promise<void>;

    process(): void;
  }

  const Bull: BullManagerContract

  export default Bull
}
