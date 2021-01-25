declare module '@ioc:Rocketseat/Bull' {
  import * as Bullmq from 'bullmq'

  export interface Queue<T = any> extends Bullmq.Queue<T> {}
  export interface Processor extends Bullmq.Processor {}
  export interface JobsOptions extends Bullmq.JobsOptions {}
  export interface QueueOptions extends Bullmq.QueueOptions {}
  export interface WorkerOptions extends Bullmq.WorkerOptions {}
  export interface Job<T = any, R = any> extends Bullmq.Job<T, R> {}

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
    onCompleted?: (...args: any[]) => void
    onProgress?: (...args: any[]) => void
    onFailed?: (...args: any[]) => void
    onWaiting?: (...args: any[]) => void
    onDelayed?: (...args: any[]) => void
    onStalled?: (...args: any[]) => void
    onRemoved?: (...args: any[]) => void
    onDrained?: (...args: any[]) => void
  }

  export interface EventListener { eventName: string; method: string }

  export interface QueueContract<T = any> extends JobContract<T> {
    bull: Queue<T>;
    listeners: EventListener[];
    instance: JobContract<T>;
  }

  export interface BullManagerContract {
    queues: { [key: string]: QueueContract };

    getByKey(key: string): QueueContract;

    add<T>(
      name: string,
      data: T,
      jobOptions?: JobsOptions
    ): Promise<Job<any, any>>;

    schedule<T>(
      name: string,
      data: T,
      date: number | Date,
      jobOptions?: JobsOptions
    ): Promise<Job<any, any>>;

    remove(name: string, jobId: string): Promise<void>;

    ui(port?: number): void;

    shutdown(): Promise<void>;

    process(): BullManagerContract;
  }

  const Bull: BullManagerContract

  export default Bull
}
