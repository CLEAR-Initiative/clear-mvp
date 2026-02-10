
/**
 * Client
**/

import * as runtime from './runtime/library.js';
import $Types = runtime.Types // general types
import $Public = runtime.Types.Public
import $Utils = runtime.Types.Utils
import $Extensions = runtime.Types.Extensions
import $Result = runtime.Types.Result

export type PrismaPromise<T> = $Public.PrismaPromise<T>


/**
 * Model User
 * 
 */
export type User = $Result.DefaultSelection<Prisma.$UserPayload>
/**
 * Model Session
 * 
 */
export type Session = $Result.DefaultSelection<Prisma.$SessionPayload>
/**
 * Model Account
 * 
 */
export type Account = $Result.DefaultSelection<Prisma.$AccountPayload>
/**
 * Model Verification
 * 
 */
export type Verification = $Result.DefaultSelection<Prisma.$VerificationPayload>
/**
 * Model Crisis
 * 
 */
export type Crisis = $Result.DefaultSelection<Prisma.$CrisisPayload>
/**
 * Model Decision
 * 
 */
export type Decision = $Result.DefaultSelection<Prisma.$DecisionPayload>
/**
 * Model Alert
 * 
 */
export type Alert = $Result.DefaultSelection<Prisma.$AlertPayload>
/**
 * Model AuditDecision
 * 
 */
export type AuditDecision = $Result.DefaultSelection<Prisma.$AuditDecisionPayload>
/**
 * Model Evidence
 * 
 */
export type Evidence = $Result.DefaultSelection<Prisma.$EvidencePayload>

/**
 * Enums
 */
export namespace $Enums {
  export const UserRole: {
  FIELD_COORDINATOR: 'FIELD_COORDINATOR',
  PROGRAM_MANAGER: 'PROGRAM_MANAGER',
  COUNTRY_DIRECTOR: 'COUNTRY_DIRECTOR',
  HUMANITARIAN_COORDINATOR: 'HUMANITARIAN_COORDINATOR',
  LOGISTICS_OFFICER: 'LOGISTICS_OFFICER',
  ADMIN: 'ADMIN',
  OTHER: 'OTHER'
};

export type UserRole = (typeof UserRole)[keyof typeof UserRole]


export const CrisisType: {
  NATURAL_DISASTER: 'NATURAL_DISASTER',
  CONFLICT: 'CONFLICT',
  EPIDEMIC: 'EPIDEMIC',
  FAMINE: 'FAMINE',
  REFUGEE_CRISIS: 'REFUGEE_CRISIS',
  ECONOMIC_CRISIS: 'ECONOMIC_CRISIS',
  OTHER: 'OTHER'
};

export type CrisisType = (typeof CrisisType)[keyof typeof CrisisType]


export const CrisisSeverity: {
  LOW: 'LOW',
  MODERATE: 'MODERATE',
  HIGH: 'HIGH',
  CRITICAL: 'CRITICAL'
};

export type CrisisSeverity = (typeof CrisisSeverity)[keyof typeof CrisisSeverity]


export const CrisisStatus: {
  ACTIVE: 'ACTIVE',
  MONITORING: 'MONITORING',
  RESOLVED: 'RESOLVED',
  ARCHIVED: 'ARCHIVED'
};

export type CrisisStatus = (typeof CrisisStatus)[keyof typeof CrisisStatus]


export const SelectedOption: {
  OPTION_A: 'OPTION_A',
  OPTION_B: 'OPTION_B',
  OPTION_C: 'OPTION_C',
  OTHER: 'OTHER'
};

export type SelectedOption = (typeof SelectedOption)[keyof typeof SelectedOption]


export const AlertType: {
  THRESHOLD_EXCEEDED: 'THRESHOLD_EXCEEDED',
  NEW_CRISIS_DETECTED: 'NEW_CRISIS_DETECTED',
  DATA_ANOMALY: 'DATA_ANOMALY',
  SYSTEM_HEALTH: 'SYSTEM_HEALTH',
  OTHER: 'OTHER'
};

export type AlertType = (typeof AlertType)[keyof typeof AlertType]


export const AlertSeverity: {
  LOW: 'LOW',
  MODERATE: 'MODERATE',
  HIGH: 'HIGH',
  CRITICAL: 'CRITICAL'
};

export type AlertSeverity = (typeof AlertSeverity)[keyof typeof AlertSeverity]


export const AuditDecisionType: {
  SECURITY_RESPONSE: 'SECURITY_RESPONSE',
  RESOURCE_ALLOCATION: 'RESOURCE_ALLOCATION',
  BENEFICIARY_SELECTION: 'BENEFICIARY_SELECTION',
  PROGRAM_MODIFICATION: 'PROGRAM_MODIFICATION',
  PARTNER_MANAGEMENT: 'PARTNER_MANAGEMENT',
  OTHER: 'OTHER'
};

export type AuditDecisionType = (typeof AuditDecisionType)[keyof typeof AuditDecisionType]


export const RiskLevel: {
  LOW: 'LOW',
  MEDIUM: 'MEDIUM',
  HIGH: 'HIGH'
};

export type RiskLevel = (typeof RiskLevel)[keyof typeof RiskLevel]


export const AuditStatus: {
  DRAFT: 'DRAFT',
  SUBMITTED: 'SUBMITTED',
  SYNCED: 'SYNCED',
  ARCHIVED: 'ARCHIVED'
};

export type AuditStatus = (typeof AuditStatus)[keyof typeof AuditStatus]


export const SyncStatus: {
  SYNCED: 'SYNCED',
  PENDING: 'PENDING',
  CONFLICT: 'CONFLICT',
  FAILED: 'FAILED'
};

export type SyncStatus = (typeof SyncStatus)[keyof typeof SyncStatus]


export const Priority: {
  LOW: 'LOW',
  NORMAL: 'NORMAL',
  HIGH: 'HIGH',
  URGENT: 'URGENT'
};

export type Priority = (typeof Priority)[keyof typeof Priority]


export const EvidenceType: {
  DOCUMENT: 'DOCUMENT',
  IMAGE: 'IMAGE',
  AUDIO: 'AUDIO',
  VIDEO: 'VIDEO',
  OTHER: 'OTHER'
};

export type EvidenceType = (typeof EvidenceType)[keyof typeof EvidenceType]

}

export type UserRole = $Enums.UserRole

export const UserRole: typeof $Enums.UserRole

export type CrisisType = $Enums.CrisisType

export const CrisisType: typeof $Enums.CrisisType

export type CrisisSeverity = $Enums.CrisisSeverity

export const CrisisSeverity: typeof $Enums.CrisisSeverity

export type CrisisStatus = $Enums.CrisisStatus

export const CrisisStatus: typeof $Enums.CrisisStatus

export type SelectedOption = $Enums.SelectedOption

export const SelectedOption: typeof $Enums.SelectedOption

export type AlertType = $Enums.AlertType

export const AlertType: typeof $Enums.AlertType

export type AlertSeverity = $Enums.AlertSeverity

export const AlertSeverity: typeof $Enums.AlertSeverity

export type AuditDecisionType = $Enums.AuditDecisionType

export const AuditDecisionType: typeof $Enums.AuditDecisionType

export type RiskLevel = $Enums.RiskLevel

export const RiskLevel: typeof $Enums.RiskLevel

export type AuditStatus = $Enums.AuditStatus

export const AuditStatus: typeof $Enums.AuditStatus

export type SyncStatus = $Enums.SyncStatus

export const SyncStatus: typeof $Enums.SyncStatus

export type Priority = $Enums.Priority

export const Priority: typeof $Enums.Priority

export type EvidenceType = $Enums.EvidenceType

export const EvidenceType: typeof $Enums.EvidenceType

/**
 * ##  Prisma Client ʲˢ
 *
 * Type-safe database client for TypeScript & Node.js
 * @example
 * ```
 * const prisma = new PrismaClient()
 * // Fetch zero or more Users
 * const users = await prisma.user.findMany()
 * ```
 *
 *
 * Read more in our [docs](https://www.prisma.io/docs/reference/tools-and-interfaces/prisma-client).
 */
export class PrismaClient<
  ClientOptions extends Prisma.PrismaClientOptions = Prisma.PrismaClientOptions,
  const U = 'log' extends keyof ClientOptions ? ClientOptions['log'] extends Array<Prisma.LogLevel | Prisma.LogDefinition> ? Prisma.GetEvents<ClientOptions['log']> : never : never,
  ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs
> {
  [K: symbol]: { types: Prisma.TypeMap<ExtArgs>['other'] }

    /**
   * ##  Prisma Client ʲˢ
   *
   * Type-safe database client for TypeScript & Node.js
   * @example
   * ```
   * const prisma = new PrismaClient()
   * // Fetch zero or more Users
   * const users = await prisma.user.findMany()
   * ```
   *
   *
   * Read more in our [docs](https://www.prisma.io/docs/reference/tools-and-interfaces/prisma-client).
   */

  constructor(optionsArg ?: Prisma.Subset<ClientOptions, Prisma.PrismaClientOptions>);
  $on<V extends U>(eventType: V, callback: (event: V extends 'query' ? Prisma.QueryEvent : Prisma.LogEvent) => void): PrismaClient;

  /**
   * Connect with the database
   */
  $connect(): $Utils.JsPromise<void>;

  /**
   * Disconnect from the database
   */
  $disconnect(): $Utils.JsPromise<void>;

/**
   * Executes a prepared raw query and returns the number of affected rows.
   * @example
   * ```
   * const result = await prisma.$executeRaw`UPDATE User SET cool = ${true} WHERE email = ${'user@email.com'};`
   * ```
   *
   * Read more in our [docs](https://www.prisma.io/docs/reference/tools-and-interfaces/prisma-client/raw-database-access).
   */
  $executeRaw<T = unknown>(query: TemplateStringsArray | Prisma.Sql, ...values: any[]): Prisma.PrismaPromise<number>;

  /**
   * Executes a raw query and returns the number of affected rows.
   * Susceptible to SQL injections, see documentation.
   * @example
   * ```
   * const result = await prisma.$executeRawUnsafe('UPDATE User SET cool = $1 WHERE email = $2 ;', true, 'user@email.com')
   * ```
   *
   * Read more in our [docs](https://www.prisma.io/docs/reference/tools-and-interfaces/prisma-client/raw-database-access).
   */
  $executeRawUnsafe<T = unknown>(query: string, ...values: any[]): Prisma.PrismaPromise<number>;

  /**
   * Performs a prepared raw query and returns the `SELECT` data.
   * @example
   * ```
   * const result = await prisma.$queryRaw`SELECT * FROM User WHERE id = ${1} OR email = ${'user@email.com'};`
   * ```
   *
   * Read more in our [docs](https://www.prisma.io/docs/reference/tools-and-interfaces/prisma-client/raw-database-access).
   */
  $queryRaw<T = unknown>(query: TemplateStringsArray | Prisma.Sql, ...values: any[]): Prisma.PrismaPromise<T>;

  /**
   * Performs a raw query and returns the `SELECT` data.
   * Susceptible to SQL injections, see documentation.
   * @example
   * ```
   * const result = await prisma.$queryRawUnsafe('SELECT * FROM User WHERE id = $1 OR email = $2;', 1, 'user@email.com')
   * ```
   *
   * Read more in our [docs](https://www.prisma.io/docs/reference/tools-and-interfaces/prisma-client/raw-database-access).
   */
  $queryRawUnsafe<T = unknown>(query: string, ...values: any[]): Prisma.PrismaPromise<T>;


  /**
   * Allows the running of a sequence of read/write operations that are guaranteed to either succeed or fail as a whole.
   * @example
   * ```
   * const [george, bob, alice] = await prisma.$transaction([
   *   prisma.user.create({ data: { name: 'George' } }),
   *   prisma.user.create({ data: { name: 'Bob' } }),
   *   prisma.user.create({ data: { name: 'Alice' } }),
   * ])
   * ```
   * 
   * Read more in our [docs](https://www.prisma.io/docs/concepts/components/prisma-client/transactions).
   */
  $transaction<P extends Prisma.PrismaPromise<any>[]>(arg: [...P], options?: { isolationLevel?: Prisma.TransactionIsolationLevel }): $Utils.JsPromise<runtime.Types.Utils.UnwrapTuple<P>>

  $transaction<R>(fn: (prisma: Omit<PrismaClient, runtime.ITXClientDenyList>) => $Utils.JsPromise<R>, options?: { maxWait?: number, timeout?: number, isolationLevel?: Prisma.TransactionIsolationLevel }): $Utils.JsPromise<R>


  $extends: $Extensions.ExtendsHook<"extends", Prisma.TypeMapCb<ClientOptions>, ExtArgs, $Utils.Call<Prisma.TypeMapCb<ClientOptions>, {
    extArgs: ExtArgs
  }>>

      /**
   * `prisma.user`: Exposes CRUD operations for the **User** model.
    * Example usage:
    * ```ts
    * // Fetch zero or more Users
    * const users = await prisma.user.findMany()
    * ```
    */
  get user(): Prisma.UserDelegate<ExtArgs, ClientOptions>;

  /**
   * `prisma.session`: Exposes CRUD operations for the **Session** model.
    * Example usage:
    * ```ts
    * // Fetch zero or more Sessions
    * const sessions = await prisma.session.findMany()
    * ```
    */
  get session(): Prisma.SessionDelegate<ExtArgs, ClientOptions>;

  /**
   * `prisma.account`: Exposes CRUD operations for the **Account** model.
    * Example usage:
    * ```ts
    * // Fetch zero or more Accounts
    * const accounts = await prisma.account.findMany()
    * ```
    */
  get account(): Prisma.AccountDelegate<ExtArgs, ClientOptions>;

  /**
   * `prisma.verification`: Exposes CRUD operations for the **Verification** model.
    * Example usage:
    * ```ts
    * // Fetch zero or more Verifications
    * const verifications = await prisma.verification.findMany()
    * ```
    */
  get verification(): Prisma.VerificationDelegate<ExtArgs, ClientOptions>;

  /**
   * `prisma.crisis`: Exposes CRUD operations for the **Crisis** model.
    * Example usage:
    * ```ts
    * // Fetch zero or more Crises
    * const crises = await prisma.crisis.findMany()
    * ```
    */
  get crisis(): Prisma.CrisisDelegate<ExtArgs, ClientOptions>;

  /**
   * `prisma.decision`: Exposes CRUD operations for the **Decision** model.
    * Example usage:
    * ```ts
    * // Fetch zero or more Decisions
    * const decisions = await prisma.decision.findMany()
    * ```
    */
  get decision(): Prisma.DecisionDelegate<ExtArgs, ClientOptions>;

  /**
   * `prisma.alert`: Exposes CRUD operations for the **Alert** model.
    * Example usage:
    * ```ts
    * // Fetch zero or more Alerts
    * const alerts = await prisma.alert.findMany()
    * ```
    */
  get alert(): Prisma.AlertDelegate<ExtArgs, ClientOptions>;

  /**
   * `prisma.auditDecision`: Exposes CRUD operations for the **AuditDecision** model.
    * Example usage:
    * ```ts
    * // Fetch zero or more AuditDecisions
    * const auditDecisions = await prisma.auditDecision.findMany()
    * ```
    */
  get auditDecision(): Prisma.AuditDecisionDelegate<ExtArgs, ClientOptions>;

  /**
   * `prisma.evidence`: Exposes CRUD operations for the **Evidence** model.
    * Example usage:
    * ```ts
    * // Fetch zero or more Evidences
    * const evidences = await prisma.evidence.findMany()
    * ```
    */
  get evidence(): Prisma.EvidenceDelegate<ExtArgs, ClientOptions>;
}

export namespace Prisma {
  export import DMMF = runtime.DMMF

  export type PrismaPromise<T> = $Public.PrismaPromise<T>

  /**
   * Validator
   */
  export import validator = runtime.Public.validator

  /**
   * Prisma Errors
   */
  export import PrismaClientKnownRequestError = runtime.PrismaClientKnownRequestError
  export import PrismaClientUnknownRequestError = runtime.PrismaClientUnknownRequestError
  export import PrismaClientRustPanicError = runtime.PrismaClientRustPanicError
  export import PrismaClientInitializationError = runtime.PrismaClientInitializationError
  export import PrismaClientValidationError = runtime.PrismaClientValidationError

  /**
   * Re-export of sql-template-tag
   */
  export import sql = runtime.sqltag
  export import empty = runtime.empty
  export import join = runtime.join
  export import raw = runtime.raw
  export import Sql = runtime.Sql



  /**
   * Decimal.js
   */
  export import Decimal = runtime.Decimal

  export type DecimalJsLike = runtime.DecimalJsLike

  /**
   * Metrics
   */
  export type Metrics = runtime.Metrics
  export type Metric<T> = runtime.Metric<T>
  export type MetricHistogram = runtime.MetricHistogram
  export type MetricHistogramBucket = runtime.MetricHistogramBucket

  /**
  * Extensions
  */
  export import Extension = $Extensions.UserArgs
  export import getExtensionContext = runtime.Extensions.getExtensionContext
  export import Args = $Public.Args
  export import Payload = $Public.Payload
  export import Result = $Public.Result
  export import Exact = $Public.Exact

  /**
   * Prisma Client JS version: 6.19.2
   * Query Engine version: c2990dca591cba766e3b7ef5d9e8a84796e47ab7
   */
  export type PrismaVersion = {
    client: string
  }

  export const prismaVersion: PrismaVersion

  /**
   * Utility Types
   */


  export import Bytes = runtime.Bytes
  export import JsonObject = runtime.JsonObject
  export import JsonArray = runtime.JsonArray
  export import JsonValue = runtime.JsonValue
  export import InputJsonObject = runtime.InputJsonObject
  export import InputJsonArray = runtime.InputJsonArray
  export import InputJsonValue = runtime.InputJsonValue

  /**
   * Types of the values used to represent different kinds of `null` values when working with JSON fields.
   *
   * @see https://www.prisma.io/docs/concepts/components/prisma-client/working-with-fields/working-with-json-fields#filtering-on-a-json-field
   */
  namespace NullTypes {
    /**
    * Type of `Prisma.DbNull`.
    *
    * You cannot use other instances of this class. Please use the `Prisma.DbNull` value.
    *
    * @see https://www.prisma.io/docs/concepts/components/prisma-client/working-with-fields/working-with-json-fields#filtering-on-a-json-field
    */
    class DbNull {
      private DbNull: never
      private constructor()
    }

    /**
    * Type of `Prisma.JsonNull`.
    *
    * You cannot use other instances of this class. Please use the `Prisma.JsonNull` value.
    *
    * @see https://www.prisma.io/docs/concepts/components/prisma-client/working-with-fields/working-with-json-fields#filtering-on-a-json-field
    */
    class JsonNull {
      private JsonNull: never
      private constructor()
    }

    /**
    * Type of `Prisma.AnyNull`.
    *
    * You cannot use other instances of this class. Please use the `Prisma.AnyNull` value.
    *
    * @see https://www.prisma.io/docs/concepts/components/prisma-client/working-with-fields/working-with-json-fields#filtering-on-a-json-field
    */
    class AnyNull {
      private AnyNull: never
      private constructor()
    }
  }

  /**
   * Helper for filtering JSON entries that have `null` on the database (empty on the db)
   *
   * @see https://www.prisma.io/docs/concepts/components/prisma-client/working-with-fields/working-with-json-fields#filtering-on-a-json-field
   */
  export const DbNull: NullTypes.DbNull

  /**
   * Helper for filtering JSON entries that have JSON `null` values (not empty on the db)
   *
   * @see https://www.prisma.io/docs/concepts/components/prisma-client/working-with-fields/working-with-json-fields#filtering-on-a-json-field
   */
  export const JsonNull: NullTypes.JsonNull

  /**
   * Helper for filtering JSON entries that are `Prisma.DbNull` or `Prisma.JsonNull`
   *
   * @see https://www.prisma.io/docs/concepts/components/prisma-client/working-with-fields/working-with-json-fields#filtering-on-a-json-field
   */
  export const AnyNull: NullTypes.AnyNull

  type SelectAndInclude = {
    select: any
    include: any
  }

  type SelectAndOmit = {
    select: any
    omit: any
  }

  /**
   * Get the type of the value, that the Promise holds.
   */
  export type PromiseType<T extends PromiseLike<any>> = T extends PromiseLike<infer U> ? U : T;

  /**
   * Get the return type of a function which returns a Promise.
   */
  export type PromiseReturnType<T extends (...args: any) => $Utils.JsPromise<any>> = PromiseType<ReturnType<T>>

  /**
   * From T, pick a set of properties whose keys are in the union K
   */
  type Prisma__Pick<T, K extends keyof T> = {
      [P in K]: T[P];
  };


  export type Enumerable<T> = T | Array<T>;

  export type RequiredKeys<T> = {
    [K in keyof T]-?: {} extends Prisma__Pick<T, K> ? never : K
  }[keyof T]

  export type TruthyKeys<T> = keyof {
    [K in keyof T as T[K] extends false | undefined | null ? never : K]: K
  }

  export type TrueKeys<T> = TruthyKeys<Prisma__Pick<T, RequiredKeys<T>>>

  /**
   * Subset
   * @desc From `T` pick properties that exist in `U`. Simple version of Intersection
   */
  export type Subset<T, U> = {
    [key in keyof T]: key extends keyof U ? T[key] : never;
  };

  /**
   * SelectSubset
   * @desc From `T` pick properties that exist in `U`. Simple version of Intersection.
   * Additionally, it validates, if both select and include are present. If the case, it errors.
   */
  export type SelectSubset<T, U> = {
    [key in keyof T]: key extends keyof U ? T[key] : never
  } &
    (T extends SelectAndInclude
      ? 'Please either choose `select` or `include`.'
      : T extends SelectAndOmit
        ? 'Please either choose `select` or `omit`.'
        : {})

  /**
   * Subset + Intersection
   * @desc From `T` pick properties that exist in `U` and intersect `K`
   */
  export type SubsetIntersection<T, U, K> = {
    [key in keyof T]: key extends keyof U ? T[key] : never
  } &
    K

  type Without<T, U> = { [P in Exclude<keyof T, keyof U>]?: never };

  /**
   * XOR is needed to have a real mutually exclusive union type
   * https://stackoverflow.com/questions/42123407/does-typescript-support-mutually-exclusive-types
   */
  type XOR<T, U> =
    T extends object ?
    U extends object ?
      (Without<T, U> & U) | (Without<U, T> & T)
    : U : T


  /**
   * Is T a Record?
   */
  type IsObject<T extends any> = T extends Array<any>
  ? False
  : T extends Date
  ? False
  : T extends Uint8Array
  ? False
  : T extends BigInt
  ? False
  : T extends object
  ? True
  : False


  /**
   * If it's T[], return T
   */
  export type UnEnumerate<T extends unknown> = T extends Array<infer U> ? U : T

  /**
   * From ts-toolbelt
   */

  type __Either<O extends object, K extends Key> = Omit<O, K> &
    {
      // Merge all but K
      [P in K]: Prisma__Pick<O, P & keyof O> // With K possibilities
    }[K]

  type EitherStrict<O extends object, K extends Key> = Strict<__Either<O, K>>

  type EitherLoose<O extends object, K extends Key> = ComputeRaw<__Either<O, K>>

  type _Either<
    O extends object,
    K extends Key,
    strict extends Boolean
  > = {
    1: EitherStrict<O, K>
    0: EitherLoose<O, K>
  }[strict]

  type Either<
    O extends object,
    K extends Key,
    strict extends Boolean = 1
  > = O extends unknown ? _Either<O, K, strict> : never

  export type Union = any

  type PatchUndefined<O extends object, O1 extends object> = {
    [K in keyof O]: O[K] extends undefined ? At<O1, K> : O[K]
  } & {}

  /** Helper Types for "Merge" **/
  export type IntersectOf<U extends Union> = (
    U extends unknown ? (k: U) => void : never
  ) extends (k: infer I) => void
    ? I
    : never

  export type Overwrite<O extends object, O1 extends object> = {
      [K in keyof O]: K extends keyof O1 ? O1[K] : O[K];
  } & {};

  type _Merge<U extends object> = IntersectOf<Overwrite<U, {
      [K in keyof U]-?: At<U, K>;
  }>>;

  type Key = string | number | symbol;
  type AtBasic<O extends object, K extends Key> = K extends keyof O ? O[K] : never;
  type AtStrict<O extends object, K extends Key> = O[K & keyof O];
  type AtLoose<O extends object, K extends Key> = O extends unknown ? AtStrict<O, K> : never;
  export type At<O extends object, K extends Key, strict extends Boolean = 1> = {
      1: AtStrict<O, K>;
      0: AtLoose<O, K>;
  }[strict];

  export type ComputeRaw<A extends any> = A extends Function ? A : {
    [K in keyof A]: A[K];
  } & {};

  export type OptionalFlat<O> = {
    [K in keyof O]?: O[K];
  } & {};

  type _Record<K extends keyof any, T> = {
    [P in K]: T;
  };

  // cause typescript not to expand types and preserve names
  type NoExpand<T> = T extends unknown ? T : never;

  // this type assumes the passed object is entirely optional
  type AtLeast<O extends object, K extends string> = NoExpand<
    O extends unknown
    ? | (K extends keyof O ? { [P in K]: O[P] } & O : O)
      | {[P in keyof O as P extends K ? P : never]-?: O[P]} & O
    : never>;

  type _Strict<U, _U = U> = U extends unknown ? U & OptionalFlat<_Record<Exclude<Keys<_U>, keyof U>, never>> : never;

  export type Strict<U extends object> = ComputeRaw<_Strict<U>>;
  /** End Helper Types for "Merge" **/

  export type Merge<U extends object> = ComputeRaw<_Merge<Strict<U>>>;

  /**
  A [[Boolean]]
  */
  export type Boolean = True | False

  // /**
  // 1
  // */
  export type True = 1

  /**
  0
  */
  export type False = 0

  export type Not<B extends Boolean> = {
    0: 1
    1: 0
  }[B]

  export type Extends<A1 extends any, A2 extends any> = [A1] extends [never]
    ? 0 // anything `never` is false
    : A1 extends A2
    ? 1
    : 0

  export type Has<U extends Union, U1 extends Union> = Not<
    Extends<Exclude<U1, U>, U1>
  >

  export type Or<B1 extends Boolean, B2 extends Boolean> = {
    0: {
      0: 0
      1: 1
    }
    1: {
      0: 1
      1: 1
    }
  }[B1][B2]

  export type Keys<U extends Union> = U extends unknown ? keyof U : never

  type Cast<A, B> = A extends B ? A : B;

  export const type: unique symbol;



  /**
   * Used by group by
   */

  export type GetScalarType<T, O> = O extends object ? {
    [P in keyof T]: P extends keyof O
      ? O[P]
      : never
  } : never

  type FieldPaths<
    T,
    U = Omit<T, '_avg' | '_sum' | '_count' | '_min' | '_max'>
  > = IsObject<T> extends True ? U : T

  type GetHavingFields<T> = {
    [K in keyof T]: Or<
      Or<Extends<'OR', K>, Extends<'AND', K>>,
      Extends<'NOT', K>
    > extends True
      ? // infer is only needed to not hit TS limit
        // based on the brilliant idea of Pierre-Antoine Mills
        // https://github.com/microsoft/TypeScript/issues/30188#issuecomment-478938437
        T[K] extends infer TK
        ? GetHavingFields<UnEnumerate<TK> extends object ? Merge<UnEnumerate<TK>> : never>
        : never
      : {} extends FieldPaths<T[K]>
      ? never
      : K
  }[keyof T]

  /**
   * Convert tuple to union
   */
  type _TupleToUnion<T> = T extends (infer E)[] ? E : never
  type TupleToUnion<K extends readonly any[]> = _TupleToUnion<K>
  type MaybeTupleToUnion<T> = T extends any[] ? TupleToUnion<T> : T

  /**
   * Like `Pick`, but additionally can also accept an array of keys
   */
  type PickEnumerable<T, K extends Enumerable<keyof T> | keyof T> = Prisma__Pick<T, MaybeTupleToUnion<K>>

  /**
   * Exclude all keys with underscores
   */
  type ExcludeUnderscoreKeys<T extends string> = T extends `_${string}` ? never : T


  export type FieldRef<Model, FieldType> = runtime.FieldRef<Model, FieldType>

  type FieldRefInputType<Model, FieldType> = Model extends never ? never : FieldRef<Model, FieldType>


  export const ModelName: {
    User: 'User',
    Session: 'Session',
    Account: 'Account',
    Verification: 'Verification',
    Crisis: 'Crisis',
    Decision: 'Decision',
    Alert: 'Alert',
    AuditDecision: 'AuditDecision',
    Evidence: 'Evidence'
  };

  export type ModelName = (typeof ModelName)[keyof typeof ModelName]


  export type Datasources = {
    db?: Datasource
  }

  interface TypeMapCb<ClientOptions = {}> extends $Utils.Fn<{extArgs: $Extensions.InternalArgs }, $Utils.Record<string, any>> {
    returns: Prisma.TypeMap<this['params']['extArgs'], ClientOptions extends { omit: infer OmitOptions } ? OmitOptions : {}>
  }

  export type TypeMap<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs, GlobalOmitOptions = {}> = {
    globalOmitOptions: {
      omit: GlobalOmitOptions
    }
    meta: {
      modelProps: "user" | "session" | "account" | "verification" | "crisis" | "decision" | "alert" | "auditDecision" | "evidence"
      txIsolationLevel: Prisma.TransactionIsolationLevel
    }
    model: {
      User: {
        payload: Prisma.$UserPayload<ExtArgs>
        fields: Prisma.UserFieldRefs
        operations: {
          findUnique: {
            args: Prisma.UserFindUniqueArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$UserPayload> | null
          }
          findUniqueOrThrow: {
            args: Prisma.UserFindUniqueOrThrowArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$UserPayload>
          }
          findFirst: {
            args: Prisma.UserFindFirstArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$UserPayload> | null
          }
          findFirstOrThrow: {
            args: Prisma.UserFindFirstOrThrowArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$UserPayload>
          }
          findMany: {
            args: Prisma.UserFindManyArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$UserPayload>[]
          }
          create: {
            args: Prisma.UserCreateArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$UserPayload>
          }
          createMany: {
            args: Prisma.UserCreateManyArgs<ExtArgs>
            result: BatchPayload
          }
          createManyAndReturn: {
            args: Prisma.UserCreateManyAndReturnArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$UserPayload>[]
          }
          delete: {
            args: Prisma.UserDeleteArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$UserPayload>
          }
          update: {
            args: Prisma.UserUpdateArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$UserPayload>
          }
          deleteMany: {
            args: Prisma.UserDeleteManyArgs<ExtArgs>
            result: BatchPayload
          }
          updateMany: {
            args: Prisma.UserUpdateManyArgs<ExtArgs>
            result: BatchPayload
          }
          updateManyAndReturn: {
            args: Prisma.UserUpdateManyAndReturnArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$UserPayload>[]
          }
          upsert: {
            args: Prisma.UserUpsertArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$UserPayload>
          }
          aggregate: {
            args: Prisma.UserAggregateArgs<ExtArgs>
            result: $Utils.Optional<AggregateUser>
          }
          groupBy: {
            args: Prisma.UserGroupByArgs<ExtArgs>
            result: $Utils.Optional<UserGroupByOutputType>[]
          }
          count: {
            args: Prisma.UserCountArgs<ExtArgs>
            result: $Utils.Optional<UserCountAggregateOutputType> | number
          }
        }
      }
      Session: {
        payload: Prisma.$SessionPayload<ExtArgs>
        fields: Prisma.SessionFieldRefs
        operations: {
          findUnique: {
            args: Prisma.SessionFindUniqueArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$SessionPayload> | null
          }
          findUniqueOrThrow: {
            args: Prisma.SessionFindUniqueOrThrowArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$SessionPayload>
          }
          findFirst: {
            args: Prisma.SessionFindFirstArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$SessionPayload> | null
          }
          findFirstOrThrow: {
            args: Prisma.SessionFindFirstOrThrowArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$SessionPayload>
          }
          findMany: {
            args: Prisma.SessionFindManyArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$SessionPayload>[]
          }
          create: {
            args: Prisma.SessionCreateArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$SessionPayload>
          }
          createMany: {
            args: Prisma.SessionCreateManyArgs<ExtArgs>
            result: BatchPayload
          }
          createManyAndReturn: {
            args: Prisma.SessionCreateManyAndReturnArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$SessionPayload>[]
          }
          delete: {
            args: Prisma.SessionDeleteArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$SessionPayload>
          }
          update: {
            args: Prisma.SessionUpdateArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$SessionPayload>
          }
          deleteMany: {
            args: Prisma.SessionDeleteManyArgs<ExtArgs>
            result: BatchPayload
          }
          updateMany: {
            args: Prisma.SessionUpdateManyArgs<ExtArgs>
            result: BatchPayload
          }
          updateManyAndReturn: {
            args: Prisma.SessionUpdateManyAndReturnArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$SessionPayload>[]
          }
          upsert: {
            args: Prisma.SessionUpsertArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$SessionPayload>
          }
          aggregate: {
            args: Prisma.SessionAggregateArgs<ExtArgs>
            result: $Utils.Optional<AggregateSession>
          }
          groupBy: {
            args: Prisma.SessionGroupByArgs<ExtArgs>
            result: $Utils.Optional<SessionGroupByOutputType>[]
          }
          count: {
            args: Prisma.SessionCountArgs<ExtArgs>
            result: $Utils.Optional<SessionCountAggregateOutputType> | number
          }
        }
      }
      Account: {
        payload: Prisma.$AccountPayload<ExtArgs>
        fields: Prisma.AccountFieldRefs
        operations: {
          findUnique: {
            args: Prisma.AccountFindUniqueArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$AccountPayload> | null
          }
          findUniqueOrThrow: {
            args: Prisma.AccountFindUniqueOrThrowArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$AccountPayload>
          }
          findFirst: {
            args: Prisma.AccountFindFirstArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$AccountPayload> | null
          }
          findFirstOrThrow: {
            args: Prisma.AccountFindFirstOrThrowArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$AccountPayload>
          }
          findMany: {
            args: Prisma.AccountFindManyArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$AccountPayload>[]
          }
          create: {
            args: Prisma.AccountCreateArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$AccountPayload>
          }
          createMany: {
            args: Prisma.AccountCreateManyArgs<ExtArgs>
            result: BatchPayload
          }
          createManyAndReturn: {
            args: Prisma.AccountCreateManyAndReturnArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$AccountPayload>[]
          }
          delete: {
            args: Prisma.AccountDeleteArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$AccountPayload>
          }
          update: {
            args: Prisma.AccountUpdateArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$AccountPayload>
          }
          deleteMany: {
            args: Prisma.AccountDeleteManyArgs<ExtArgs>
            result: BatchPayload
          }
          updateMany: {
            args: Prisma.AccountUpdateManyArgs<ExtArgs>
            result: BatchPayload
          }
          updateManyAndReturn: {
            args: Prisma.AccountUpdateManyAndReturnArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$AccountPayload>[]
          }
          upsert: {
            args: Prisma.AccountUpsertArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$AccountPayload>
          }
          aggregate: {
            args: Prisma.AccountAggregateArgs<ExtArgs>
            result: $Utils.Optional<AggregateAccount>
          }
          groupBy: {
            args: Prisma.AccountGroupByArgs<ExtArgs>
            result: $Utils.Optional<AccountGroupByOutputType>[]
          }
          count: {
            args: Prisma.AccountCountArgs<ExtArgs>
            result: $Utils.Optional<AccountCountAggregateOutputType> | number
          }
        }
      }
      Verification: {
        payload: Prisma.$VerificationPayload<ExtArgs>
        fields: Prisma.VerificationFieldRefs
        operations: {
          findUnique: {
            args: Prisma.VerificationFindUniqueArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$VerificationPayload> | null
          }
          findUniqueOrThrow: {
            args: Prisma.VerificationFindUniqueOrThrowArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$VerificationPayload>
          }
          findFirst: {
            args: Prisma.VerificationFindFirstArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$VerificationPayload> | null
          }
          findFirstOrThrow: {
            args: Prisma.VerificationFindFirstOrThrowArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$VerificationPayload>
          }
          findMany: {
            args: Prisma.VerificationFindManyArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$VerificationPayload>[]
          }
          create: {
            args: Prisma.VerificationCreateArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$VerificationPayload>
          }
          createMany: {
            args: Prisma.VerificationCreateManyArgs<ExtArgs>
            result: BatchPayload
          }
          createManyAndReturn: {
            args: Prisma.VerificationCreateManyAndReturnArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$VerificationPayload>[]
          }
          delete: {
            args: Prisma.VerificationDeleteArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$VerificationPayload>
          }
          update: {
            args: Prisma.VerificationUpdateArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$VerificationPayload>
          }
          deleteMany: {
            args: Prisma.VerificationDeleteManyArgs<ExtArgs>
            result: BatchPayload
          }
          updateMany: {
            args: Prisma.VerificationUpdateManyArgs<ExtArgs>
            result: BatchPayload
          }
          updateManyAndReturn: {
            args: Prisma.VerificationUpdateManyAndReturnArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$VerificationPayload>[]
          }
          upsert: {
            args: Prisma.VerificationUpsertArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$VerificationPayload>
          }
          aggregate: {
            args: Prisma.VerificationAggregateArgs<ExtArgs>
            result: $Utils.Optional<AggregateVerification>
          }
          groupBy: {
            args: Prisma.VerificationGroupByArgs<ExtArgs>
            result: $Utils.Optional<VerificationGroupByOutputType>[]
          }
          count: {
            args: Prisma.VerificationCountArgs<ExtArgs>
            result: $Utils.Optional<VerificationCountAggregateOutputType> | number
          }
        }
      }
      Crisis: {
        payload: Prisma.$CrisisPayload<ExtArgs>
        fields: Prisma.CrisisFieldRefs
        operations: {
          findUnique: {
            args: Prisma.CrisisFindUniqueArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$CrisisPayload> | null
          }
          findUniqueOrThrow: {
            args: Prisma.CrisisFindUniqueOrThrowArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$CrisisPayload>
          }
          findFirst: {
            args: Prisma.CrisisFindFirstArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$CrisisPayload> | null
          }
          findFirstOrThrow: {
            args: Prisma.CrisisFindFirstOrThrowArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$CrisisPayload>
          }
          findMany: {
            args: Prisma.CrisisFindManyArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$CrisisPayload>[]
          }
          create: {
            args: Prisma.CrisisCreateArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$CrisisPayload>
          }
          createMany: {
            args: Prisma.CrisisCreateManyArgs<ExtArgs>
            result: BatchPayload
          }
          createManyAndReturn: {
            args: Prisma.CrisisCreateManyAndReturnArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$CrisisPayload>[]
          }
          delete: {
            args: Prisma.CrisisDeleteArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$CrisisPayload>
          }
          update: {
            args: Prisma.CrisisUpdateArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$CrisisPayload>
          }
          deleteMany: {
            args: Prisma.CrisisDeleteManyArgs<ExtArgs>
            result: BatchPayload
          }
          updateMany: {
            args: Prisma.CrisisUpdateManyArgs<ExtArgs>
            result: BatchPayload
          }
          updateManyAndReturn: {
            args: Prisma.CrisisUpdateManyAndReturnArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$CrisisPayload>[]
          }
          upsert: {
            args: Prisma.CrisisUpsertArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$CrisisPayload>
          }
          aggregate: {
            args: Prisma.CrisisAggregateArgs<ExtArgs>
            result: $Utils.Optional<AggregateCrisis>
          }
          groupBy: {
            args: Prisma.CrisisGroupByArgs<ExtArgs>
            result: $Utils.Optional<CrisisGroupByOutputType>[]
          }
          count: {
            args: Prisma.CrisisCountArgs<ExtArgs>
            result: $Utils.Optional<CrisisCountAggregateOutputType> | number
          }
        }
      }
      Decision: {
        payload: Prisma.$DecisionPayload<ExtArgs>
        fields: Prisma.DecisionFieldRefs
        operations: {
          findUnique: {
            args: Prisma.DecisionFindUniqueArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$DecisionPayload> | null
          }
          findUniqueOrThrow: {
            args: Prisma.DecisionFindUniqueOrThrowArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$DecisionPayload>
          }
          findFirst: {
            args: Prisma.DecisionFindFirstArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$DecisionPayload> | null
          }
          findFirstOrThrow: {
            args: Prisma.DecisionFindFirstOrThrowArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$DecisionPayload>
          }
          findMany: {
            args: Prisma.DecisionFindManyArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$DecisionPayload>[]
          }
          create: {
            args: Prisma.DecisionCreateArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$DecisionPayload>
          }
          createMany: {
            args: Prisma.DecisionCreateManyArgs<ExtArgs>
            result: BatchPayload
          }
          createManyAndReturn: {
            args: Prisma.DecisionCreateManyAndReturnArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$DecisionPayload>[]
          }
          delete: {
            args: Prisma.DecisionDeleteArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$DecisionPayload>
          }
          update: {
            args: Prisma.DecisionUpdateArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$DecisionPayload>
          }
          deleteMany: {
            args: Prisma.DecisionDeleteManyArgs<ExtArgs>
            result: BatchPayload
          }
          updateMany: {
            args: Prisma.DecisionUpdateManyArgs<ExtArgs>
            result: BatchPayload
          }
          updateManyAndReturn: {
            args: Prisma.DecisionUpdateManyAndReturnArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$DecisionPayload>[]
          }
          upsert: {
            args: Prisma.DecisionUpsertArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$DecisionPayload>
          }
          aggregate: {
            args: Prisma.DecisionAggregateArgs<ExtArgs>
            result: $Utils.Optional<AggregateDecision>
          }
          groupBy: {
            args: Prisma.DecisionGroupByArgs<ExtArgs>
            result: $Utils.Optional<DecisionGroupByOutputType>[]
          }
          count: {
            args: Prisma.DecisionCountArgs<ExtArgs>
            result: $Utils.Optional<DecisionCountAggregateOutputType> | number
          }
        }
      }
      Alert: {
        payload: Prisma.$AlertPayload<ExtArgs>
        fields: Prisma.AlertFieldRefs
        operations: {
          findUnique: {
            args: Prisma.AlertFindUniqueArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$AlertPayload> | null
          }
          findUniqueOrThrow: {
            args: Prisma.AlertFindUniqueOrThrowArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$AlertPayload>
          }
          findFirst: {
            args: Prisma.AlertFindFirstArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$AlertPayload> | null
          }
          findFirstOrThrow: {
            args: Prisma.AlertFindFirstOrThrowArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$AlertPayload>
          }
          findMany: {
            args: Prisma.AlertFindManyArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$AlertPayload>[]
          }
          create: {
            args: Prisma.AlertCreateArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$AlertPayload>
          }
          createMany: {
            args: Prisma.AlertCreateManyArgs<ExtArgs>
            result: BatchPayload
          }
          createManyAndReturn: {
            args: Prisma.AlertCreateManyAndReturnArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$AlertPayload>[]
          }
          delete: {
            args: Prisma.AlertDeleteArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$AlertPayload>
          }
          update: {
            args: Prisma.AlertUpdateArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$AlertPayload>
          }
          deleteMany: {
            args: Prisma.AlertDeleteManyArgs<ExtArgs>
            result: BatchPayload
          }
          updateMany: {
            args: Prisma.AlertUpdateManyArgs<ExtArgs>
            result: BatchPayload
          }
          updateManyAndReturn: {
            args: Prisma.AlertUpdateManyAndReturnArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$AlertPayload>[]
          }
          upsert: {
            args: Prisma.AlertUpsertArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$AlertPayload>
          }
          aggregate: {
            args: Prisma.AlertAggregateArgs<ExtArgs>
            result: $Utils.Optional<AggregateAlert>
          }
          groupBy: {
            args: Prisma.AlertGroupByArgs<ExtArgs>
            result: $Utils.Optional<AlertGroupByOutputType>[]
          }
          count: {
            args: Prisma.AlertCountArgs<ExtArgs>
            result: $Utils.Optional<AlertCountAggregateOutputType> | number
          }
        }
      }
      AuditDecision: {
        payload: Prisma.$AuditDecisionPayload<ExtArgs>
        fields: Prisma.AuditDecisionFieldRefs
        operations: {
          findUnique: {
            args: Prisma.AuditDecisionFindUniqueArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$AuditDecisionPayload> | null
          }
          findUniqueOrThrow: {
            args: Prisma.AuditDecisionFindUniqueOrThrowArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$AuditDecisionPayload>
          }
          findFirst: {
            args: Prisma.AuditDecisionFindFirstArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$AuditDecisionPayload> | null
          }
          findFirstOrThrow: {
            args: Prisma.AuditDecisionFindFirstOrThrowArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$AuditDecisionPayload>
          }
          findMany: {
            args: Prisma.AuditDecisionFindManyArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$AuditDecisionPayload>[]
          }
          create: {
            args: Prisma.AuditDecisionCreateArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$AuditDecisionPayload>
          }
          createMany: {
            args: Prisma.AuditDecisionCreateManyArgs<ExtArgs>
            result: BatchPayload
          }
          createManyAndReturn: {
            args: Prisma.AuditDecisionCreateManyAndReturnArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$AuditDecisionPayload>[]
          }
          delete: {
            args: Prisma.AuditDecisionDeleteArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$AuditDecisionPayload>
          }
          update: {
            args: Prisma.AuditDecisionUpdateArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$AuditDecisionPayload>
          }
          deleteMany: {
            args: Prisma.AuditDecisionDeleteManyArgs<ExtArgs>
            result: BatchPayload
          }
          updateMany: {
            args: Prisma.AuditDecisionUpdateManyArgs<ExtArgs>
            result: BatchPayload
          }
          updateManyAndReturn: {
            args: Prisma.AuditDecisionUpdateManyAndReturnArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$AuditDecisionPayload>[]
          }
          upsert: {
            args: Prisma.AuditDecisionUpsertArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$AuditDecisionPayload>
          }
          aggregate: {
            args: Prisma.AuditDecisionAggregateArgs<ExtArgs>
            result: $Utils.Optional<AggregateAuditDecision>
          }
          groupBy: {
            args: Prisma.AuditDecisionGroupByArgs<ExtArgs>
            result: $Utils.Optional<AuditDecisionGroupByOutputType>[]
          }
          count: {
            args: Prisma.AuditDecisionCountArgs<ExtArgs>
            result: $Utils.Optional<AuditDecisionCountAggregateOutputType> | number
          }
        }
      }
      Evidence: {
        payload: Prisma.$EvidencePayload<ExtArgs>
        fields: Prisma.EvidenceFieldRefs
        operations: {
          findUnique: {
            args: Prisma.EvidenceFindUniqueArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$EvidencePayload> | null
          }
          findUniqueOrThrow: {
            args: Prisma.EvidenceFindUniqueOrThrowArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$EvidencePayload>
          }
          findFirst: {
            args: Prisma.EvidenceFindFirstArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$EvidencePayload> | null
          }
          findFirstOrThrow: {
            args: Prisma.EvidenceFindFirstOrThrowArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$EvidencePayload>
          }
          findMany: {
            args: Prisma.EvidenceFindManyArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$EvidencePayload>[]
          }
          create: {
            args: Prisma.EvidenceCreateArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$EvidencePayload>
          }
          createMany: {
            args: Prisma.EvidenceCreateManyArgs<ExtArgs>
            result: BatchPayload
          }
          createManyAndReturn: {
            args: Prisma.EvidenceCreateManyAndReturnArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$EvidencePayload>[]
          }
          delete: {
            args: Prisma.EvidenceDeleteArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$EvidencePayload>
          }
          update: {
            args: Prisma.EvidenceUpdateArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$EvidencePayload>
          }
          deleteMany: {
            args: Prisma.EvidenceDeleteManyArgs<ExtArgs>
            result: BatchPayload
          }
          updateMany: {
            args: Prisma.EvidenceUpdateManyArgs<ExtArgs>
            result: BatchPayload
          }
          updateManyAndReturn: {
            args: Prisma.EvidenceUpdateManyAndReturnArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$EvidencePayload>[]
          }
          upsert: {
            args: Prisma.EvidenceUpsertArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$EvidencePayload>
          }
          aggregate: {
            args: Prisma.EvidenceAggregateArgs<ExtArgs>
            result: $Utils.Optional<AggregateEvidence>
          }
          groupBy: {
            args: Prisma.EvidenceGroupByArgs<ExtArgs>
            result: $Utils.Optional<EvidenceGroupByOutputType>[]
          }
          count: {
            args: Prisma.EvidenceCountArgs<ExtArgs>
            result: $Utils.Optional<EvidenceCountAggregateOutputType> | number
          }
        }
      }
    }
  } & {
    other: {
      payload: any
      operations: {
        $executeRaw: {
          args: [query: TemplateStringsArray | Prisma.Sql, ...values: any[]],
          result: any
        }
        $executeRawUnsafe: {
          args: [query: string, ...values: any[]],
          result: any
        }
        $queryRaw: {
          args: [query: TemplateStringsArray | Prisma.Sql, ...values: any[]],
          result: any
        }
        $queryRawUnsafe: {
          args: [query: string, ...values: any[]],
          result: any
        }
      }
    }
  }
  export const defineExtension: $Extensions.ExtendsHook<"define", Prisma.TypeMapCb, $Extensions.DefaultArgs>
  export type DefaultPrismaClient = PrismaClient
  export type ErrorFormat = 'pretty' | 'colorless' | 'minimal'
  export interface PrismaClientOptions {
    /**
     * Overwrites the datasource url from your schema.prisma file
     */
    datasources?: Datasources
    /**
     * Overwrites the datasource url from your schema.prisma file
     */
    datasourceUrl?: string
    /**
     * @default "colorless"
     */
    errorFormat?: ErrorFormat
    /**
     * @example
     * ```
     * // Shorthand for `emit: 'stdout'`
     * log: ['query', 'info', 'warn', 'error']
     * 
     * // Emit as events only
     * log: [
     *   { emit: 'event', level: 'query' },
     *   { emit: 'event', level: 'info' },
     *   { emit: 'event', level: 'warn' }
     *   { emit: 'event', level: 'error' }
     * ]
     * 
     * / Emit as events and log to stdout
     * og: [
     *  { emit: 'stdout', level: 'query' },
     *  { emit: 'stdout', level: 'info' },
     *  { emit: 'stdout', level: 'warn' }
     *  { emit: 'stdout', level: 'error' }
     * 
     * ```
     * Read more in our [docs](https://www.prisma.io/docs/reference/tools-and-interfaces/prisma-client/logging#the-log-option).
     */
    log?: (LogLevel | LogDefinition)[]
    /**
     * The default values for transactionOptions
     * maxWait ?= 2000
     * timeout ?= 5000
     */
    transactionOptions?: {
      maxWait?: number
      timeout?: number
      isolationLevel?: Prisma.TransactionIsolationLevel
    }
    /**
     * Instance of a Driver Adapter, e.g., like one provided by `@prisma/adapter-planetscale`
     */
    adapter?: runtime.SqlDriverAdapterFactory | null
    /**
     * Global configuration for omitting model fields by default.
     * 
     * @example
     * ```
     * const prisma = new PrismaClient({
     *   omit: {
     *     user: {
     *       password: true
     *     }
     *   }
     * })
     * ```
     */
    omit?: Prisma.GlobalOmitConfig
  }
  export type GlobalOmitConfig = {
    user?: UserOmit
    session?: SessionOmit
    account?: AccountOmit
    verification?: VerificationOmit
    crisis?: CrisisOmit
    decision?: DecisionOmit
    alert?: AlertOmit
    auditDecision?: AuditDecisionOmit
    evidence?: EvidenceOmit
  }

  /* Types for Logging */
  export type LogLevel = 'info' | 'query' | 'warn' | 'error'
  export type LogDefinition = {
    level: LogLevel
    emit: 'stdout' | 'event'
  }

  export type CheckIsLogLevel<T> = T extends LogLevel ? T : never;

  export type GetLogType<T> = CheckIsLogLevel<
    T extends LogDefinition ? T['level'] : T
  >;

  export type GetEvents<T extends any[]> = T extends Array<LogLevel | LogDefinition>
    ? GetLogType<T[number]>
    : never;

  export type QueryEvent = {
    timestamp: Date
    query: string
    params: string
    duration: number
    target: string
  }

  export type LogEvent = {
    timestamp: Date
    message: string
    target: string
  }
  /* End Types for Logging */


  export type PrismaAction =
    | 'findUnique'
    | 'findUniqueOrThrow'
    | 'findMany'
    | 'findFirst'
    | 'findFirstOrThrow'
    | 'create'
    | 'createMany'
    | 'createManyAndReturn'
    | 'update'
    | 'updateMany'
    | 'updateManyAndReturn'
    | 'upsert'
    | 'delete'
    | 'deleteMany'
    | 'executeRaw'
    | 'queryRaw'
    | 'aggregate'
    | 'count'
    | 'runCommandRaw'
    | 'findRaw'
    | 'groupBy'

  // tested in getLogLevel.test.ts
  export function getLogLevel(log: Array<LogLevel | LogDefinition>): LogLevel | undefined;

  /**
   * `PrismaClient` proxy available in interactive transactions.
   */
  export type TransactionClient = Omit<Prisma.DefaultPrismaClient, runtime.ITXClientDenyList>

  export type Datasource = {
    url?: string
  }

  /**
   * Count Types
   */


  /**
   * Count Type UserCountOutputType
   */

  export type UserCountOutputType = {
    sessions: number
    accounts: number
    decisions: number
    auditDecisions: number
    crises: number
  }

  export type UserCountOutputTypeSelect<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    sessions?: boolean | UserCountOutputTypeCountSessionsArgs
    accounts?: boolean | UserCountOutputTypeCountAccountsArgs
    decisions?: boolean | UserCountOutputTypeCountDecisionsArgs
    auditDecisions?: boolean | UserCountOutputTypeCountAuditDecisionsArgs
    crises?: boolean | UserCountOutputTypeCountCrisesArgs
  }

  // Custom InputTypes
  /**
   * UserCountOutputType without action
   */
  export type UserCountOutputTypeDefaultArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the UserCountOutputType
     */
    select?: UserCountOutputTypeSelect<ExtArgs> | null
  }

  /**
   * UserCountOutputType without action
   */
  export type UserCountOutputTypeCountSessionsArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    where?: SessionWhereInput
  }

  /**
   * UserCountOutputType without action
   */
  export type UserCountOutputTypeCountAccountsArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    where?: AccountWhereInput
  }

  /**
   * UserCountOutputType without action
   */
  export type UserCountOutputTypeCountDecisionsArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    where?: DecisionWhereInput
  }

  /**
   * UserCountOutputType without action
   */
  export type UserCountOutputTypeCountAuditDecisionsArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    where?: AuditDecisionWhereInput
  }

  /**
   * UserCountOutputType without action
   */
  export type UserCountOutputTypeCountCrisesArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    where?: CrisisWhereInput
  }


  /**
   * Count Type CrisisCountOutputType
   */

  export type CrisisCountOutputType = {
    decisions: number
    alerts: number
  }

  export type CrisisCountOutputTypeSelect<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    decisions?: boolean | CrisisCountOutputTypeCountDecisionsArgs
    alerts?: boolean | CrisisCountOutputTypeCountAlertsArgs
  }

  // Custom InputTypes
  /**
   * CrisisCountOutputType without action
   */
  export type CrisisCountOutputTypeDefaultArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the CrisisCountOutputType
     */
    select?: CrisisCountOutputTypeSelect<ExtArgs> | null
  }

  /**
   * CrisisCountOutputType without action
   */
  export type CrisisCountOutputTypeCountDecisionsArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    where?: DecisionWhereInput
  }

  /**
   * CrisisCountOutputType without action
   */
  export type CrisisCountOutputTypeCountAlertsArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    where?: AlertWhereInput
  }


  /**
   * Count Type AuditDecisionCountOutputType
   */

  export type AuditDecisionCountOutputType = {
    evidence: number
  }

  export type AuditDecisionCountOutputTypeSelect<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    evidence?: boolean | AuditDecisionCountOutputTypeCountEvidenceArgs
  }

  // Custom InputTypes
  /**
   * AuditDecisionCountOutputType without action
   */
  export type AuditDecisionCountOutputTypeDefaultArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the AuditDecisionCountOutputType
     */
    select?: AuditDecisionCountOutputTypeSelect<ExtArgs> | null
  }

  /**
   * AuditDecisionCountOutputType without action
   */
  export type AuditDecisionCountOutputTypeCountEvidenceArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    where?: EvidenceWhereInput
  }


  /**
   * Models
   */

  /**
   * Model User
   */

  export type AggregateUser = {
    _count: UserCountAggregateOutputType | null
    _min: UserMinAggregateOutputType | null
    _max: UserMaxAggregateOutputType | null
  }

  export type UserMinAggregateOutputType = {
    id: string | null
    name: string | null
    email: string | null
    emailVerified: boolean | null
    image: string | null
    createdAt: Date | null
    updatedAt: Date | null
    role: $Enums.UserRole | null
    organization: string | null
    country: string | null
  }

  export type UserMaxAggregateOutputType = {
    id: string | null
    name: string | null
    email: string | null
    emailVerified: boolean | null
    image: string | null
    createdAt: Date | null
    updatedAt: Date | null
    role: $Enums.UserRole | null
    organization: string | null
    country: string | null
  }

  export type UserCountAggregateOutputType = {
    id: number
    name: number
    email: number
    emailVerified: number
    image: number
    createdAt: number
    updatedAt: number
    role: number
    organization: number
    country: number
    _all: number
  }


  export type UserMinAggregateInputType = {
    id?: true
    name?: true
    email?: true
    emailVerified?: true
    image?: true
    createdAt?: true
    updatedAt?: true
    role?: true
    organization?: true
    country?: true
  }

  export type UserMaxAggregateInputType = {
    id?: true
    name?: true
    email?: true
    emailVerified?: true
    image?: true
    createdAt?: true
    updatedAt?: true
    role?: true
    organization?: true
    country?: true
  }

  export type UserCountAggregateInputType = {
    id?: true
    name?: true
    email?: true
    emailVerified?: true
    image?: true
    createdAt?: true
    updatedAt?: true
    role?: true
    organization?: true
    country?: true
    _all?: true
  }

  export type UserAggregateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Filter which User to aggregate.
     */
    where?: UserWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of Users to fetch.
     */
    orderBy?: UserOrderByWithRelationInput | UserOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the start position
     */
    cursor?: UserWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` Users from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` Users.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Count returned Users
    **/
    _count?: true | UserCountAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to find the minimum value
    **/
    _min?: UserMinAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to find the maximum value
    **/
    _max?: UserMaxAggregateInputType
  }

  export type GetUserAggregateType<T extends UserAggregateArgs> = {
        [P in keyof T & keyof AggregateUser]: P extends '_count' | 'count'
      ? T[P] extends true
        ? number
        : GetScalarType<T[P], AggregateUser[P]>
      : GetScalarType<T[P], AggregateUser[P]>
  }




  export type UserGroupByArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    where?: UserWhereInput
    orderBy?: UserOrderByWithAggregationInput | UserOrderByWithAggregationInput[]
    by: UserScalarFieldEnum[] | UserScalarFieldEnum
    having?: UserScalarWhereWithAggregatesInput
    take?: number
    skip?: number
    _count?: UserCountAggregateInputType | true
    _min?: UserMinAggregateInputType
    _max?: UserMaxAggregateInputType
  }

  export type UserGroupByOutputType = {
    id: string
    name: string
    email: string
    emailVerified: boolean
    image: string | null
    createdAt: Date
    updatedAt: Date
    role: $Enums.UserRole
    organization: string | null
    country: string | null
    _count: UserCountAggregateOutputType | null
    _min: UserMinAggregateOutputType | null
    _max: UserMaxAggregateOutputType | null
  }

  type GetUserGroupByPayload<T extends UserGroupByArgs> = Prisma.PrismaPromise<
    Array<
      PickEnumerable<UserGroupByOutputType, T['by']> &
        {
          [P in ((keyof T) & (keyof UserGroupByOutputType))]: P extends '_count'
            ? T[P] extends boolean
              ? number
              : GetScalarType<T[P], UserGroupByOutputType[P]>
            : GetScalarType<T[P], UserGroupByOutputType[P]>
        }
      >
    >


  export type UserSelect<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetSelect<{
    id?: boolean
    name?: boolean
    email?: boolean
    emailVerified?: boolean
    image?: boolean
    createdAt?: boolean
    updatedAt?: boolean
    role?: boolean
    organization?: boolean
    country?: boolean
    sessions?: boolean | User$sessionsArgs<ExtArgs>
    accounts?: boolean | User$accountsArgs<ExtArgs>
    decisions?: boolean | User$decisionsArgs<ExtArgs>
    auditDecisions?: boolean | User$auditDecisionsArgs<ExtArgs>
    crises?: boolean | User$crisesArgs<ExtArgs>
    _count?: boolean | UserCountOutputTypeDefaultArgs<ExtArgs>
  }, ExtArgs["result"]["user"]>

  export type UserSelectCreateManyAndReturn<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetSelect<{
    id?: boolean
    name?: boolean
    email?: boolean
    emailVerified?: boolean
    image?: boolean
    createdAt?: boolean
    updatedAt?: boolean
    role?: boolean
    organization?: boolean
    country?: boolean
  }, ExtArgs["result"]["user"]>

  export type UserSelectUpdateManyAndReturn<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetSelect<{
    id?: boolean
    name?: boolean
    email?: boolean
    emailVerified?: boolean
    image?: boolean
    createdAt?: boolean
    updatedAt?: boolean
    role?: boolean
    organization?: boolean
    country?: boolean
  }, ExtArgs["result"]["user"]>

  export type UserSelectScalar = {
    id?: boolean
    name?: boolean
    email?: boolean
    emailVerified?: boolean
    image?: boolean
    createdAt?: boolean
    updatedAt?: boolean
    role?: boolean
    organization?: boolean
    country?: boolean
  }

  export type UserOmit<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetOmit<"id" | "name" | "email" | "emailVerified" | "image" | "createdAt" | "updatedAt" | "role" | "organization" | "country", ExtArgs["result"]["user"]>
  export type UserInclude<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    sessions?: boolean | User$sessionsArgs<ExtArgs>
    accounts?: boolean | User$accountsArgs<ExtArgs>
    decisions?: boolean | User$decisionsArgs<ExtArgs>
    auditDecisions?: boolean | User$auditDecisionsArgs<ExtArgs>
    crises?: boolean | User$crisesArgs<ExtArgs>
    _count?: boolean | UserCountOutputTypeDefaultArgs<ExtArgs>
  }
  export type UserIncludeCreateManyAndReturn<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {}
  export type UserIncludeUpdateManyAndReturn<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {}

  export type $UserPayload<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    name: "User"
    objects: {
      sessions: Prisma.$SessionPayload<ExtArgs>[]
      accounts: Prisma.$AccountPayload<ExtArgs>[]
      decisions: Prisma.$DecisionPayload<ExtArgs>[]
      auditDecisions: Prisma.$AuditDecisionPayload<ExtArgs>[]
      crises: Prisma.$CrisisPayload<ExtArgs>[]
    }
    scalars: $Extensions.GetPayloadResult<{
      id: string
      name: string
      email: string
      emailVerified: boolean
      image: string | null
      createdAt: Date
      updatedAt: Date
      role: $Enums.UserRole
      organization: string | null
      country: string | null
    }, ExtArgs["result"]["user"]>
    composites: {}
  }

  type UserGetPayload<S extends boolean | null | undefined | UserDefaultArgs> = $Result.GetResult<Prisma.$UserPayload, S>

  type UserCountArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> =
    Omit<UserFindManyArgs, 'select' | 'include' | 'distinct' | 'omit'> & {
      select?: UserCountAggregateInputType | true
    }

  export interface UserDelegate<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs, GlobalOmitOptions = {}> {
    [K: symbol]: { types: Prisma.TypeMap<ExtArgs>['model']['User'], meta: { name: 'User' } }
    /**
     * Find zero or one User that matches the filter.
     * @param {UserFindUniqueArgs} args - Arguments to find a User
     * @example
     * // Get one User
     * const user = await prisma.user.findUnique({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findUnique<T extends UserFindUniqueArgs>(args: SelectSubset<T, UserFindUniqueArgs<ExtArgs>>): Prisma__UserClient<$Result.GetResult<Prisma.$UserPayload<ExtArgs>, T, "findUnique", GlobalOmitOptions> | null, null, ExtArgs, GlobalOmitOptions>

    /**
     * Find one User that matches the filter or throw an error with `error.code='P2025'`
     * if no matches were found.
     * @param {UserFindUniqueOrThrowArgs} args - Arguments to find a User
     * @example
     * // Get one User
     * const user = await prisma.user.findUniqueOrThrow({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findUniqueOrThrow<T extends UserFindUniqueOrThrowArgs>(args: SelectSubset<T, UserFindUniqueOrThrowArgs<ExtArgs>>): Prisma__UserClient<$Result.GetResult<Prisma.$UserPayload<ExtArgs>, T, "findUniqueOrThrow", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Find the first User that matches the filter.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {UserFindFirstArgs} args - Arguments to find a User
     * @example
     * // Get one User
     * const user = await prisma.user.findFirst({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findFirst<T extends UserFindFirstArgs>(args?: SelectSubset<T, UserFindFirstArgs<ExtArgs>>): Prisma__UserClient<$Result.GetResult<Prisma.$UserPayload<ExtArgs>, T, "findFirst", GlobalOmitOptions> | null, null, ExtArgs, GlobalOmitOptions>

    /**
     * Find the first User that matches the filter or
     * throw `PrismaKnownClientError` with `P2025` code if no matches were found.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {UserFindFirstOrThrowArgs} args - Arguments to find a User
     * @example
     * // Get one User
     * const user = await prisma.user.findFirstOrThrow({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findFirstOrThrow<T extends UserFindFirstOrThrowArgs>(args?: SelectSubset<T, UserFindFirstOrThrowArgs<ExtArgs>>): Prisma__UserClient<$Result.GetResult<Prisma.$UserPayload<ExtArgs>, T, "findFirstOrThrow", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Find zero or more Users that matches the filter.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {UserFindManyArgs} args - Arguments to filter and select certain fields only.
     * @example
     * // Get all Users
     * const users = await prisma.user.findMany()
     * 
     * // Get first 10 Users
     * const users = await prisma.user.findMany({ take: 10 })
     * 
     * // Only select the `id`
     * const userWithIdOnly = await prisma.user.findMany({ select: { id: true } })
     * 
     */
    findMany<T extends UserFindManyArgs>(args?: SelectSubset<T, UserFindManyArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$UserPayload<ExtArgs>, T, "findMany", GlobalOmitOptions>>

    /**
     * Create a User.
     * @param {UserCreateArgs} args - Arguments to create a User.
     * @example
     * // Create one User
     * const User = await prisma.user.create({
     *   data: {
     *     // ... data to create a User
     *   }
     * })
     * 
     */
    create<T extends UserCreateArgs>(args: SelectSubset<T, UserCreateArgs<ExtArgs>>): Prisma__UserClient<$Result.GetResult<Prisma.$UserPayload<ExtArgs>, T, "create", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Create many Users.
     * @param {UserCreateManyArgs} args - Arguments to create many Users.
     * @example
     * // Create many Users
     * const user = await prisma.user.createMany({
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     *     
     */
    createMany<T extends UserCreateManyArgs>(args?: SelectSubset<T, UserCreateManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Create many Users and returns the data saved in the database.
     * @param {UserCreateManyAndReturnArgs} args - Arguments to create many Users.
     * @example
     * // Create many Users
     * const user = await prisma.user.createManyAndReturn({
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * 
     * // Create many Users and only return the `id`
     * const userWithIdOnly = await prisma.user.createManyAndReturn({
     *   select: { id: true },
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * 
     */
    createManyAndReturn<T extends UserCreateManyAndReturnArgs>(args?: SelectSubset<T, UserCreateManyAndReturnArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$UserPayload<ExtArgs>, T, "createManyAndReturn", GlobalOmitOptions>>

    /**
     * Delete a User.
     * @param {UserDeleteArgs} args - Arguments to delete one User.
     * @example
     * // Delete one User
     * const User = await prisma.user.delete({
     *   where: {
     *     // ... filter to delete one User
     *   }
     * })
     * 
     */
    delete<T extends UserDeleteArgs>(args: SelectSubset<T, UserDeleteArgs<ExtArgs>>): Prisma__UserClient<$Result.GetResult<Prisma.$UserPayload<ExtArgs>, T, "delete", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Update one User.
     * @param {UserUpdateArgs} args - Arguments to update one User.
     * @example
     * // Update one User
     * const user = await prisma.user.update({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: {
     *     // ... provide data here
     *   }
     * })
     * 
     */
    update<T extends UserUpdateArgs>(args: SelectSubset<T, UserUpdateArgs<ExtArgs>>): Prisma__UserClient<$Result.GetResult<Prisma.$UserPayload<ExtArgs>, T, "update", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Delete zero or more Users.
     * @param {UserDeleteManyArgs} args - Arguments to filter Users to delete.
     * @example
     * // Delete a few Users
     * const { count } = await prisma.user.deleteMany({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     * 
     */
    deleteMany<T extends UserDeleteManyArgs>(args?: SelectSubset<T, UserDeleteManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Update zero or more Users.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {UserUpdateManyArgs} args - Arguments to update one or more rows.
     * @example
     * // Update many Users
     * const user = await prisma.user.updateMany({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: {
     *     // ... provide data here
     *   }
     * })
     * 
     */
    updateMany<T extends UserUpdateManyArgs>(args: SelectSubset<T, UserUpdateManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Update zero or more Users and returns the data updated in the database.
     * @param {UserUpdateManyAndReturnArgs} args - Arguments to update many Users.
     * @example
     * // Update many Users
     * const user = await prisma.user.updateManyAndReturn({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * 
     * // Update zero or more Users and only return the `id`
     * const userWithIdOnly = await prisma.user.updateManyAndReturn({
     *   select: { id: true },
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * 
     */
    updateManyAndReturn<T extends UserUpdateManyAndReturnArgs>(args: SelectSubset<T, UserUpdateManyAndReturnArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$UserPayload<ExtArgs>, T, "updateManyAndReturn", GlobalOmitOptions>>

    /**
     * Create or update one User.
     * @param {UserUpsertArgs} args - Arguments to update or create a User.
     * @example
     * // Update or create a User
     * const user = await prisma.user.upsert({
     *   create: {
     *     // ... data to create a User
     *   },
     *   update: {
     *     // ... in case it already exists, update
     *   },
     *   where: {
     *     // ... the filter for the User we want to update
     *   }
     * })
     */
    upsert<T extends UserUpsertArgs>(args: SelectSubset<T, UserUpsertArgs<ExtArgs>>): Prisma__UserClient<$Result.GetResult<Prisma.$UserPayload<ExtArgs>, T, "upsert", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>


    /**
     * Count the number of Users.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {UserCountArgs} args - Arguments to filter Users to count.
     * @example
     * // Count the number of Users
     * const count = await prisma.user.count({
     *   where: {
     *     // ... the filter for the Users we want to count
     *   }
     * })
    **/
    count<T extends UserCountArgs>(
      args?: Subset<T, UserCountArgs>,
    ): Prisma.PrismaPromise<
      T extends $Utils.Record<'select', any>
        ? T['select'] extends true
          ? number
          : GetScalarType<T['select'], UserCountAggregateOutputType>
        : number
    >

    /**
     * Allows you to perform aggregations operations on a User.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {UserAggregateArgs} args - Select which aggregations you would like to apply and on what fields.
     * @example
     * // Ordered by age ascending
     * // Where email contains prisma.io
     * // Limited to the 10 users
     * const aggregations = await prisma.user.aggregate({
     *   _avg: {
     *     age: true,
     *   },
     *   where: {
     *     email: {
     *       contains: "prisma.io",
     *     },
     *   },
     *   orderBy: {
     *     age: "asc",
     *   },
     *   take: 10,
     * })
    **/
    aggregate<T extends UserAggregateArgs>(args: Subset<T, UserAggregateArgs>): Prisma.PrismaPromise<GetUserAggregateType<T>>

    /**
     * Group by User.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {UserGroupByArgs} args - Group by arguments.
     * @example
     * // Group by city, order by createdAt, get count
     * const result = await prisma.user.groupBy({
     *   by: ['city', 'createdAt'],
     *   orderBy: {
     *     createdAt: true
     *   },
     *   _count: {
     *     _all: true
     *   },
     * })
     * 
    **/
    groupBy<
      T extends UserGroupByArgs,
      HasSelectOrTake extends Or<
        Extends<'skip', Keys<T>>,
        Extends<'take', Keys<T>>
      >,
      OrderByArg extends True extends HasSelectOrTake
        ? { orderBy: UserGroupByArgs['orderBy'] }
        : { orderBy?: UserGroupByArgs['orderBy'] },
      OrderFields extends ExcludeUnderscoreKeys<Keys<MaybeTupleToUnion<T['orderBy']>>>,
      ByFields extends MaybeTupleToUnion<T['by']>,
      ByValid extends Has<ByFields, OrderFields>,
      HavingFields extends GetHavingFields<T['having']>,
      HavingValid extends Has<ByFields, HavingFields>,
      ByEmpty extends T['by'] extends never[] ? True : False,
      InputErrors extends ByEmpty extends True
      ? `Error: "by" must not be empty.`
      : HavingValid extends False
      ? {
          [P in HavingFields]: P extends ByFields
            ? never
            : P extends string
            ? `Error: Field "${P}" used in "having" needs to be provided in "by".`
            : [
                Error,
                'Field ',
                P,
                ` in "having" needs to be provided in "by"`,
              ]
        }[HavingFields]
      : 'take' extends Keys<T>
      ? 'orderBy' extends Keys<T>
        ? ByValid extends True
          ? {}
          : {
              [P in OrderFields]: P extends ByFields
                ? never
                : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
            }[OrderFields]
        : 'Error: If you provide "take", you also need to provide "orderBy"'
      : 'skip' extends Keys<T>
      ? 'orderBy' extends Keys<T>
        ? ByValid extends True
          ? {}
          : {
              [P in OrderFields]: P extends ByFields
                ? never
                : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
            }[OrderFields]
        : 'Error: If you provide "skip", you also need to provide "orderBy"'
      : ByValid extends True
      ? {}
      : {
          [P in OrderFields]: P extends ByFields
            ? never
            : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
        }[OrderFields]
    >(args: SubsetIntersection<T, UserGroupByArgs, OrderByArg> & InputErrors): {} extends InputErrors ? GetUserGroupByPayload<T> : Prisma.PrismaPromise<InputErrors>
  /**
   * Fields of the User model
   */
  readonly fields: UserFieldRefs;
  }

  /**
   * The delegate class that acts as a "Promise-like" for User.
   * Why is this prefixed with `Prisma__`?
   * Because we want to prevent naming conflicts as mentioned in
   * https://github.com/prisma/prisma-client-js/issues/707
   */
  export interface Prisma__UserClient<T, Null = never, ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs, GlobalOmitOptions = {}> extends Prisma.PrismaPromise<T> {
    readonly [Symbol.toStringTag]: "PrismaPromise"
    sessions<T extends User$sessionsArgs<ExtArgs> = {}>(args?: Subset<T, User$sessionsArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$SessionPayload<ExtArgs>, T, "findMany", GlobalOmitOptions> | Null>
    accounts<T extends User$accountsArgs<ExtArgs> = {}>(args?: Subset<T, User$accountsArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$AccountPayload<ExtArgs>, T, "findMany", GlobalOmitOptions> | Null>
    decisions<T extends User$decisionsArgs<ExtArgs> = {}>(args?: Subset<T, User$decisionsArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$DecisionPayload<ExtArgs>, T, "findMany", GlobalOmitOptions> | Null>
    auditDecisions<T extends User$auditDecisionsArgs<ExtArgs> = {}>(args?: Subset<T, User$auditDecisionsArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$AuditDecisionPayload<ExtArgs>, T, "findMany", GlobalOmitOptions> | Null>
    crises<T extends User$crisesArgs<ExtArgs> = {}>(args?: Subset<T, User$crisesArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$CrisisPayload<ExtArgs>, T, "findMany", GlobalOmitOptions> | Null>
    /**
     * Attaches callbacks for the resolution and/or rejection of the Promise.
     * @param onfulfilled The callback to execute when the Promise is resolved.
     * @param onrejected The callback to execute when the Promise is rejected.
     * @returns A Promise for the completion of which ever callback is executed.
     */
    then<TResult1 = T, TResult2 = never>(onfulfilled?: ((value: T) => TResult1 | PromiseLike<TResult1>) | undefined | null, onrejected?: ((reason: any) => TResult2 | PromiseLike<TResult2>) | undefined | null): $Utils.JsPromise<TResult1 | TResult2>
    /**
     * Attaches a callback for only the rejection of the Promise.
     * @param onrejected The callback to execute when the Promise is rejected.
     * @returns A Promise for the completion of the callback.
     */
    catch<TResult = never>(onrejected?: ((reason: any) => TResult | PromiseLike<TResult>) | undefined | null): $Utils.JsPromise<T | TResult>
    /**
     * Attaches a callback that is invoked when the Promise is settled (fulfilled or rejected). The
     * resolved value cannot be modified from the callback.
     * @param onfinally The callback to execute when the Promise is settled (fulfilled or rejected).
     * @returns A Promise for the completion of the callback.
     */
    finally(onfinally?: (() => void) | undefined | null): $Utils.JsPromise<T>
  }




  /**
   * Fields of the User model
   */
  interface UserFieldRefs {
    readonly id: FieldRef<"User", 'String'>
    readonly name: FieldRef<"User", 'String'>
    readonly email: FieldRef<"User", 'String'>
    readonly emailVerified: FieldRef<"User", 'Boolean'>
    readonly image: FieldRef<"User", 'String'>
    readonly createdAt: FieldRef<"User", 'DateTime'>
    readonly updatedAt: FieldRef<"User", 'DateTime'>
    readonly role: FieldRef<"User", 'UserRole'>
    readonly organization: FieldRef<"User", 'String'>
    readonly country: FieldRef<"User", 'String'>
  }
    

  // Custom InputTypes
  /**
   * User findUnique
   */
  export type UserFindUniqueArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the User
     */
    select?: UserSelect<ExtArgs> | null
    /**
     * Omit specific fields from the User
     */
    omit?: UserOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: UserInclude<ExtArgs> | null
    /**
     * Filter, which User to fetch.
     */
    where: UserWhereUniqueInput
  }

  /**
   * User findUniqueOrThrow
   */
  export type UserFindUniqueOrThrowArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the User
     */
    select?: UserSelect<ExtArgs> | null
    /**
     * Omit specific fields from the User
     */
    omit?: UserOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: UserInclude<ExtArgs> | null
    /**
     * Filter, which User to fetch.
     */
    where: UserWhereUniqueInput
  }

  /**
   * User findFirst
   */
  export type UserFindFirstArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the User
     */
    select?: UserSelect<ExtArgs> | null
    /**
     * Omit specific fields from the User
     */
    omit?: UserOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: UserInclude<ExtArgs> | null
    /**
     * Filter, which User to fetch.
     */
    where?: UserWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of Users to fetch.
     */
    orderBy?: UserOrderByWithRelationInput | UserOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for searching for Users.
     */
    cursor?: UserWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` Users from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` Users.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/distinct Distinct Docs}
     * 
     * Filter by unique combinations of Users.
     */
    distinct?: UserScalarFieldEnum | UserScalarFieldEnum[]
  }

  /**
   * User findFirstOrThrow
   */
  export type UserFindFirstOrThrowArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the User
     */
    select?: UserSelect<ExtArgs> | null
    /**
     * Omit specific fields from the User
     */
    omit?: UserOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: UserInclude<ExtArgs> | null
    /**
     * Filter, which User to fetch.
     */
    where?: UserWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of Users to fetch.
     */
    orderBy?: UserOrderByWithRelationInput | UserOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for searching for Users.
     */
    cursor?: UserWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` Users from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` Users.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/distinct Distinct Docs}
     * 
     * Filter by unique combinations of Users.
     */
    distinct?: UserScalarFieldEnum | UserScalarFieldEnum[]
  }

  /**
   * User findMany
   */
  export type UserFindManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the User
     */
    select?: UserSelect<ExtArgs> | null
    /**
     * Omit specific fields from the User
     */
    omit?: UserOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: UserInclude<ExtArgs> | null
    /**
     * Filter, which Users to fetch.
     */
    where?: UserWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of Users to fetch.
     */
    orderBy?: UserOrderByWithRelationInput | UserOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for listing Users.
     */
    cursor?: UserWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` Users from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` Users.
     */
    skip?: number
    distinct?: UserScalarFieldEnum | UserScalarFieldEnum[]
  }

  /**
   * User create
   */
  export type UserCreateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the User
     */
    select?: UserSelect<ExtArgs> | null
    /**
     * Omit specific fields from the User
     */
    omit?: UserOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: UserInclude<ExtArgs> | null
    /**
     * The data needed to create a User.
     */
    data: XOR<UserCreateInput, UserUncheckedCreateInput>
  }

  /**
   * User createMany
   */
  export type UserCreateManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * The data used to create many Users.
     */
    data: UserCreateManyInput | UserCreateManyInput[]
    skipDuplicates?: boolean
  }

  /**
   * User createManyAndReturn
   */
  export type UserCreateManyAndReturnArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the User
     */
    select?: UserSelectCreateManyAndReturn<ExtArgs> | null
    /**
     * Omit specific fields from the User
     */
    omit?: UserOmit<ExtArgs> | null
    /**
     * The data used to create many Users.
     */
    data: UserCreateManyInput | UserCreateManyInput[]
    skipDuplicates?: boolean
  }

  /**
   * User update
   */
  export type UserUpdateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the User
     */
    select?: UserSelect<ExtArgs> | null
    /**
     * Omit specific fields from the User
     */
    omit?: UserOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: UserInclude<ExtArgs> | null
    /**
     * The data needed to update a User.
     */
    data: XOR<UserUpdateInput, UserUncheckedUpdateInput>
    /**
     * Choose, which User to update.
     */
    where: UserWhereUniqueInput
  }

  /**
   * User updateMany
   */
  export type UserUpdateManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * The data used to update Users.
     */
    data: XOR<UserUpdateManyMutationInput, UserUncheckedUpdateManyInput>
    /**
     * Filter which Users to update
     */
    where?: UserWhereInput
    /**
     * Limit how many Users to update.
     */
    limit?: number
  }

  /**
   * User updateManyAndReturn
   */
  export type UserUpdateManyAndReturnArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the User
     */
    select?: UserSelectUpdateManyAndReturn<ExtArgs> | null
    /**
     * Omit specific fields from the User
     */
    omit?: UserOmit<ExtArgs> | null
    /**
     * The data used to update Users.
     */
    data: XOR<UserUpdateManyMutationInput, UserUncheckedUpdateManyInput>
    /**
     * Filter which Users to update
     */
    where?: UserWhereInput
    /**
     * Limit how many Users to update.
     */
    limit?: number
  }

  /**
   * User upsert
   */
  export type UserUpsertArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the User
     */
    select?: UserSelect<ExtArgs> | null
    /**
     * Omit specific fields from the User
     */
    omit?: UserOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: UserInclude<ExtArgs> | null
    /**
     * The filter to search for the User to update in case it exists.
     */
    where: UserWhereUniqueInput
    /**
     * In case the User found by the `where` argument doesn't exist, create a new User with this data.
     */
    create: XOR<UserCreateInput, UserUncheckedCreateInput>
    /**
     * In case the User was found with the provided `where` argument, update it with this data.
     */
    update: XOR<UserUpdateInput, UserUncheckedUpdateInput>
  }

  /**
   * User delete
   */
  export type UserDeleteArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the User
     */
    select?: UserSelect<ExtArgs> | null
    /**
     * Omit specific fields from the User
     */
    omit?: UserOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: UserInclude<ExtArgs> | null
    /**
     * Filter which User to delete.
     */
    where: UserWhereUniqueInput
  }

  /**
   * User deleteMany
   */
  export type UserDeleteManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Filter which Users to delete
     */
    where?: UserWhereInput
    /**
     * Limit how many Users to delete.
     */
    limit?: number
  }

  /**
   * User.sessions
   */
  export type User$sessionsArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Session
     */
    select?: SessionSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Session
     */
    omit?: SessionOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: SessionInclude<ExtArgs> | null
    where?: SessionWhereInput
    orderBy?: SessionOrderByWithRelationInput | SessionOrderByWithRelationInput[]
    cursor?: SessionWhereUniqueInput
    take?: number
    skip?: number
    distinct?: SessionScalarFieldEnum | SessionScalarFieldEnum[]
  }

  /**
   * User.accounts
   */
  export type User$accountsArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Account
     */
    select?: AccountSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Account
     */
    omit?: AccountOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: AccountInclude<ExtArgs> | null
    where?: AccountWhereInput
    orderBy?: AccountOrderByWithRelationInput | AccountOrderByWithRelationInput[]
    cursor?: AccountWhereUniqueInput
    take?: number
    skip?: number
    distinct?: AccountScalarFieldEnum | AccountScalarFieldEnum[]
  }

  /**
   * User.decisions
   */
  export type User$decisionsArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Decision
     */
    select?: DecisionSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Decision
     */
    omit?: DecisionOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: DecisionInclude<ExtArgs> | null
    where?: DecisionWhereInput
    orderBy?: DecisionOrderByWithRelationInput | DecisionOrderByWithRelationInput[]
    cursor?: DecisionWhereUniqueInput
    take?: number
    skip?: number
    distinct?: DecisionScalarFieldEnum | DecisionScalarFieldEnum[]
  }

  /**
   * User.auditDecisions
   */
  export type User$auditDecisionsArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the AuditDecision
     */
    select?: AuditDecisionSelect<ExtArgs> | null
    /**
     * Omit specific fields from the AuditDecision
     */
    omit?: AuditDecisionOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: AuditDecisionInclude<ExtArgs> | null
    where?: AuditDecisionWhereInput
    orderBy?: AuditDecisionOrderByWithRelationInput | AuditDecisionOrderByWithRelationInput[]
    cursor?: AuditDecisionWhereUniqueInput
    take?: number
    skip?: number
    distinct?: AuditDecisionScalarFieldEnum | AuditDecisionScalarFieldEnum[]
  }

  /**
   * User.crises
   */
  export type User$crisesArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Crisis
     */
    select?: CrisisSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Crisis
     */
    omit?: CrisisOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: CrisisInclude<ExtArgs> | null
    where?: CrisisWhereInput
    orderBy?: CrisisOrderByWithRelationInput | CrisisOrderByWithRelationInput[]
    cursor?: CrisisWhereUniqueInput
    take?: number
    skip?: number
    distinct?: CrisisScalarFieldEnum | CrisisScalarFieldEnum[]
  }

  /**
   * User without action
   */
  export type UserDefaultArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the User
     */
    select?: UserSelect<ExtArgs> | null
    /**
     * Omit specific fields from the User
     */
    omit?: UserOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: UserInclude<ExtArgs> | null
  }


  /**
   * Model Session
   */

  export type AggregateSession = {
    _count: SessionCountAggregateOutputType | null
    _min: SessionMinAggregateOutputType | null
    _max: SessionMaxAggregateOutputType | null
  }

  export type SessionMinAggregateOutputType = {
    id: string | null
    expiresAt: Date | null
    token: string | null
    createdAt: Date | null
    updatedAt: Date | null
    ipAddress: string | null
    userAgent: string | null
    userId: string | null
  }

  export type SessionMaxAggregateOutputType = {
    id: string | null
    expiresAt: Date | null
    token: string | null
    createdAt: Date | null
    updatedAt: Date | null
    ipAddress: string | null
    userAgent: string | null
    userId: string | null
  }

  export type SessionCountAggregateOutputType = {
    id: number
    expiresAt: number
    token: number
    createdAt: number
    updatedAt: number
    ipAddress: number
    userAgent: number
    userId: number
    _all: number
  }


  export type SessionMinAggregateInputType = {
    id?: true
    expiresAt?: true
    token?: true
    createdAt?: true
    updatedAt?: true
    ipAddress?: true
    userAgent?: true
    userId?: true
  }

  export type SessionMaxAggregateInputType = {
    id?: true
    expiresAt?: true
    token?: true
    createdAt?: true
    updatedAt?: true
    ipAddress?: true
    userAgent?: true
    userId?: true
  }

  export type SessionCountAggregateInputType = {
    id?: true
    expiresAt?: true
    token?: true
    createdAt?: true
    updatedAt?: true
    ipAddress?: true
    userAgent?: true
    userId?: true
    _all?: true
  }

  export type SessionAggregateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Filter which Session to aggregate.
     */
    where?: SessionWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of Sessions to fetch.
     */
    orderBy?: SessionOrderByWithRelationInput | SessionOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the start position
     */
    cursor?: SessionWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` Sessions from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` Sessions.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Count returned Sessions
    **/
    _count?: true | SessionCountAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to find the minimum value
    **/
    _min?: SessionMinAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to find the maximum value
    **/
    _max?: SessionMaxAggregateInputType
  }

  export type GetSessionAggregateType<T extends SessionAggregateArgs> = {
        [P in keyof T & keyof AggregateSession]: P extends '_count' | 'count'
      ? T[P] extends true
        ? number
        : GetScalarType<T[P], AggregateSession[P]>
      : GetScalarType<T[P], AggregateSession[P]>
  }




  export type SessionGroupByArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    where?: SessionWhereInput
    orderBy?: SessionOrderByWithAggregationInput | SessionOrderByWithAggregationInput[]
    by: SessionScalarFieldEnum[] | SessionScalarFieldEnum
    having?: SessionScalarWhereWithAggregatesInput
    take?: number
    skip?: number
    _count?: SessionCountAggregateInputType | true
    _min?: SessionMinAggregateInputType
    _max?: SessionMaxAggregateInputType
  }

  export type SessionGroupByOutputType = {
    id: string
    expiresAt: Date
    token: string
    createdAt: Date
    updatedAt: Date
    ipAddress: string | null
    userAgent: string | null
    userId: string
    _count: SessionCountAggregateOutputType | null
    _min: SessionMinAggregateOutputType | null
    _max: SessionMaxAggregateOutputType | null
  }

  type GetSessionGroupByPayload<T extends SessionGroupByArgs> = Prisma.PrismaPromise<
    Array<
      PickEnumerable<SessionGroupByOutputType, T['by']> &
        {
          [P in ((keyof T) & (keyof SessionGroupByOutputType))]: P extends '_count'
            ? T[P] extends boolean
              ? number
              : GetScalarType<T[P], SessionGroupByOutputType[P]>
            : GetScalarType<T[P], SessionGroupByOutputType[P]>
        }
      >
    >


  export type SessionSelect<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetSelect<{
    id?: boolean
    expiresAt?: boolean
    token?: boolean
    createdAt?: boolean
    updatedAt?: boolean
    ipAddress?: boolean
    userAgent?: boolean
    userId?: boolean
    user?: boolean | UserDefaultArgs<ExtArgs>
  }, ExtArgs["result"]["session"]>

  export type SessionSelectCreateManyAndReturn<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetSelect<{
    id?: boolean
    expiresAt?: boolean
    token?: boolean
    createdAt?: boolean
    updatedAt?: boolean
    ipAddress?: boolean
    userAgent?: boolean
    userId?: boolean
    user?: boolean | UserDefaultArgs<ExtArgs>
  }, ExtArgs["result"]["session"]>

  export type SessionSelectUpdateManyAndReturn<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetSelect<{
    id?: boolean
    expiresAt?: boolean
    token?: boolean
    createdAt?: boolean
    updatedAt?: boolean
    ipAddress?: boolean
    userAgent?: boolean
    userId?: boolean
    user?: boolean | UserDefaultArgs<ExtArgs>
  }, ExtArgs["result"]["session"]>

  export type SessionSelectScalar = {
    id?: boolean
    expiresAt?: boolean
    token?: boolean
    createdAt?: boolean
    updatedAt?: boolean
    ipAddress?: boolean
    userAgent?: boolean
    userId?: boolean
  }

  export type SessionOmit<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetOmit<"id" | "expiresAt" | "token" | "createdAt" | "updatedAt" | "ipAddress" | "userAgent" | "userId", ExtArgs["result"]["session"]>
  export type SessionInclude<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    user?: boolean | UserDefaultArgs<ExtArgs>
  }
  export type SessionIncludeCreateManyAndReturn<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    user?: boolean | UserDefaultArgs<ExtArgs>
  }
  export type SessionIncludeUpdateManyAndReturn<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    user?: boolean | UserDefaultArgs<ExtArgs>
  }

  export type $SessionPayload<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    name: "Session"
    objects: {
      user: Prisma.$UserPayload<ExtArgs>
    }
    scalars: $Extensions.GetPayloadResult<{
      id: string
      expiresAt: Date
      token: string
      createdAt: Date
      updatedAt: Date
      ipAddress: string | null
      userAgent: string | null
      userId: string
    }, ExtArgs["result"]["session"]>
    composites: {}
  }

  type SessionGetPayload<S extends boolean | null | undefined | SessionDefaultArgs> = $Result.GetResult<Prisma.$SessionPayload, S>

  type SessionCountArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> =
    Omit<SessionFindManyArgs, 'select' | 'include' | 'distinct' | 'omit'> & {
      select?: SessionCountAggregateInputType | true
    }

  export interface SessionDelegate<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs, GlobalOmitOptions = {}> {
    [K: symbol]: { types: Prisma.TypeMap<ExtArgs>['model']['Session'], meta: { name: 'Session' } }
    /**
     * Find zero or one Session that matches the filter.
     * @param {SessionFindUniqueArgs} args - Arguments to find a Session
     * @example
     * // Get one Session
     * const session = await prisma.session.findUnique({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findUnique<T extends SessionFindUniqueArgs>(args: SelectSubset<T, SessionFindUniqueArgs<ExtArgs>>): Prisma__SessionClient<$Result.GetResult<Prisma.$SessionPayload<ExtArgs>, T, "findUnique", GlobalOmitOptions> | null, null, ExtArgs, GlobalOmitOptions>

    /**
     * Find one Session that matches the filter or throw an error with `error.code='P2025'`
     * if no matches were found.
     * @param {SessionFindUniqueOrThrowArgs} args - Arguments to find a Session
     * @example
     * // Get one Session
     * const session = await prisma.session.findUniqueOrThrow({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findUniqueOrThrow<T extends SessionFindUniqueOrThrowArgs>(args: SelectSubset<T, SessionFindUniqueOrThrowArgs<ExtArgs>>): Prisma__SessionClient<$Result.GetResult<Prisma.$SessionPayload<ExtArgs>, T, "findUniqueOrThrow", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Find the first Session that matches the filter.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {SessionFindFirstArgs} args - Arguments to find a Session
     * @example
     * // Get one Session
     * const session = await prisma.session.findFirst({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findFirst<T extends SessionFindFirstArgs>(args?: SelectSubset<T, SessionFindFirstArgs<ExtArgs>>): Prisma__SessionClient<$Result.GetResult<Prisma.$SessionPayload<ExtArgs>, T, "findFirst", GlobalOmitOptions> | null, null, ExtArgs, GlobalOmitOptions>

    /**
     * Find the first Session that matches the filter or
     * throw `PrismaKnownClientError` with `P2025` code if no matches were found.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {SessionFindFirstOrThrowArgs} args - Arguments to find a Session
     * @example
     * // Get one Session
     * const session = await prisma.session.findFirstOrThrow({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findFirstOrThrow<T extends SessionFindFirstOrThrowArgs>(args?: SelectSubset<T, SessionFindFirstOrThrowArgs<ExtArgs>>): Prisma__SessionClient<$Result.GetResult<Prisma.$SessionPayload<ExtArgs>, T, "findFirstOrThrow", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Find zero or more Sessions that matches the filter.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {SessionFindManyArgs} args - Arguments to filter and select certain fields only.
     * @example
     * // Get all Sessions
     * const sessions = await prisma.session.findMany()
     * 
     * // Get first 10 Sessions
     * const sessions = await prisma.session.findMany({ take: 10 })
     * 
     * // Only select the `id`
     * const sessionWithIdOnly = await prisma.session.findMany({ select: { id: true } })
     * 
     */
    findMany<T extends SessionFindManyArgs>(args?: SelectSubset<T, SessionFindManyArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$SessionPayload<ExtArgs>, T, "findMany", GlobalOmitOptions>>

    /**
     * Create a Session.
     * @param {SessionCreateArgs} args - Arguments to create a Session.
     * @example
     * // Create one Session
     * const Session = await prisma.session.create({
     *   data: {
     *     // ... data to create a Session
     *   }
     * })
     * 
     */
    create<T extends SessionCreateArgs>(args: SelectSubset<T, SessionCreateArgs<ExtArgs>>): Prisma__SessionClient<$Result.GetResult<Prisma.$SessionPayload<ExtArgs>, T, "create", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Create many Sessions.
     * @param {SessionCreateManyArgs} args - Arguments to create many Sessions.
     * @example
     * // Create many Sessions
     * const session = await prisma.session.createMany({
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     *     
     */
    createMany<T extends SessionCreateManyArgs>(args?: SelectSubset<T, SessionCreateManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Create many Sessions and returns the data saved in the database.
     * @param {SessionCreateManyAndReturnArgs} args - Arguments to create many Sessions.
     * @example
     * // Create many Sessions
     * const session = await prisma.session.createManyAndReturn({
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * 
     * // Create many Sessions and only return the `id`
     * const sessionWithIdOnly = await prisma.session.createManyAndReturn({
     *   select: { id: true },
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * 
     */
    createManyAndReturn<T extends SessionCreateManyAndReturnArgs>(args?: SelectSubset<T, SessionCreateManyAndReturnArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$SessionPayload<ExtArgs>, T, "createManyAndReturn", GlobalOmitOptions>>

    /**
     * Delete a Session.
     * @param {SessionDeleteArgs} args - Arguments to delete one Session.
     * @example
     * // Delete one Session
     * const Session = await prisma.session.delete({
     *   where: {
     *     // ... filter to delete one Session
     *   }
     * })
     * 
     */
    delete<T extends SessionDeleteArgs>(args: SelectSubset<T, SessionDeleteArgs<ExtArgs>>): Prisma__SessionClient<$Result.GetResult<Prisma.$SessionPayload<ExtArgs>, T, "delete", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Update one Session.
     * @param {SessionUpdateArgs} args - Arguments to update one Session.
     * @example
     * // Update one Session
     * const session = await prisma.session.update({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: {
     *     // ... provide data here
     *   }
     * })
     * 
     */
    update<T extends SessionUpdateArgs>(args: SelectSubset<T, SessionUpdateArgs<ExtArgs>>): Prisma__SessionClient<$Result.GetResult<Prisma.$SessionPayload<ExtArgs>, T, "update", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Delete zero or more Sessions.
     * @param {SessionDeleteManyArgs} args - Arguments to filter Sessions to delete.
     * @example
     * // Delete a few Sessions
     * const { count } = await prisma.session.deleteMany({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     * 
     */
    deleteMany<T extends SessionDeleteManyArgs>(args?: SelectSubset<T, SessionDeleteManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Update zero or more Sessions.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {SessionUpdateManyArgs} args - Arguments to update one or more rows.
     * @example
     * // Update many Sessions
     * const session = await prisma.session.updateMany({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: {
     *     // ... provide data here
     *   }
     * })
     * 
     */
    updateMany<T extends SessionUpdateManyArgs>(args: SelectSubset<T, SessionUpdateManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Update zero or more Sessions and returns the data updated in the database.
     * @param {SessionUpdateManyAndReturnArgs} args - Arguments to update many Sessions.
     * @example
     * // Update many Sessions
     * const session = await prisma.session.updateManyAndReturn({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * 
     * // Update zero or more Sessions and only return the `id`
     * const sessionWithIdOnly = await prisma.session.updateManyAndReturn({
     *   select: { id: true },
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * 
     */
    updateManyAndReturn<T extends SessionUpdateManyAndReturnArgs>(args: SelectSubset<T, SessionUpdateManyAndReturnArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$SessionPayload<ExtArgs>, T, "updateManyAndReturn", GlobalOmitOptions>>

    /**
     * Create or update one Session.
     * @param {SessionUpsertArgs} args - Arguments to update or create a Session.
     * @example
     * // Update or create a Session
     * const session = await prisma.session.upsert({
     *   create: {
     *     // ... data to create a Session
     *   },
     *   update: {
     *     // ... in case it already exists, update
     *   },
     *   where: {
     *     // ... the filter for the Session we want to update
     *   }
     * })
     */
    upsert<T extends SessionUpsertArgs>(args: SelectSubset<T, SessionUpsertArgs<ExtArgs>>): Prisma__SessionClient<$Result.GetResult<Prisma.$SessionPayload<ExtArgs>, T, "upsert", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>


    /**
     * Count the number of Sessions.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {SessionCountArgs} args - Arguments to filter Sessions to count.
     * @example
     * // Count the number of Sessions
     * const count = await prisma.session.count({
     *   where: {
     *     // ... the filter for the Sessions we want to count
     *   }
     * })
    **/
    count<T extends SessionCountArgs>(
      args?: Subset<T, SessionCountArgs>,
    ): Prisma.PrismaPromise<
      T extends $Utils.Record<'select', any>
        ? T['select'] extends true
          ? number
          : GetScalarType<T['select'], SessionCountAggregateOutputType>
        : number
    >

    /**
     * Allows you to perform aggregations operations on a Session.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {SessionAggregateArgs} args - Select which aggregations you would like to apply and on what fields.
     * @example
     * // Ordered by age ascending
     * // Where email contains prisma.io
     * // Limited to the 10 users
     * const aggregations = await prisma.user.aggregate({
     *   _avg: {
     *     age: true,
     *   },
     *   where: {
     *     email: {
     *       contains: "prisma.io",
     *     },
     *   },
     *   orderBy: {
     *     age: "asc",
     *   },
     *   take: 10,
     * })
    **/
    aggregate<T extends SessionAggregateArgs>(args: Subset<T, SessionAggregateArgs>): Prisma.PrismaPromise<GetSessionAggregateType<T>>

    /**
     * Group by Session.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {SessionGroupByArgs} args - Group by arguments.
     * @example
     * // Group by city, order by createdAt, get count
     * const result = await prisma.user.groupBy({
     *   by: ['city', 'createdAt'],
     *   orderBy: {
     *     createdAt: true
     *   },
     *   _count: {
     *     _all: true
     *   },
     * })
     * 
    **/
    groupBy<
      T extends SessionGroupByArgs,
      HasSelectOrTake extends Or<
        Extends<'skip', Keys<T>>,
        Extends<'take', Keys<T>>
      >,
      OrderByArg extends True extends HasSelectOrTake
        ? { orderBy: SessionGroupByArgs['orderBy'] }
        : { orderBy?: SessionGroupByArgs['orderBy'] },
      OrderFields extends ExcludeUnderscoreKeys<Keys<MaybeTupleToUnion<T['orderBy']>>>,
      ByFields extends MaybeTupleToUnion<T['by']>,
      ByValid extends Has<ByFields, OrderFields>,
      HavingFields extends GetHavingFields<T['having']>,
      HavingValid extends Has<ByFields, HavingFields>,
      ByEmpty extends T['by'] extends never[] ? True : False,
      InputErrors extends ByEmpty extends True
      ? `Error: "by" must not be empty.`
      : HavingValid extends False
      ? {
          [P in HavingFields]: P extends ByFields
            ? never
            : P extends string
            ? `Error: Field "${P}" used in "having" needs to be provided in "by".`
            : [
                Error,
                'Field ',
                P,
                ` in "having" needs to be provided in "by"`,
              ]
        }[HavingFields]
      : 'take' extends Keys<T>
      ? 'orderBy' extends Keys<T>
        ? ByValid extends True
          ? {}
          : {
              [P in OrderFields]: P extends ByFields
                ? never
                : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
            }[OrderFields]
        : 'Error: If you provide "take", you also need to provide "orderBy"'
      : 'skip' extends Keys<T>
      ? 'orderBy' extends Keys<T>
        ? ByValid extends True
          ? {}
          : {
              [P in OrderFields]: P extends ByFields
                ? never
                : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
            }[OrderFields]
        : 'Error: If you provide "skip", you also need to provide "orderBy"'
      : ByValid extends True
      ? {}
      : {
          [P in OrderFields]: P extends ByFields
            ? never
            : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
        }[OrderFields]
    >(args: SubsetIntersection<T, SessionGroupByArgs, OrderByArg> & InputErrors): {} extends InputErrors ? GetSessionGroupByPayload<T> : Prisma.PrismaPromise<InputErrors>
  /**
   * Fields of the Session model
   */
  readonly fields: SessionFieldRefs;
  }

  /**
   * The delegate class that acts as a "Promise-like" for Session.
   * Why is this prefixed with `Prisma__`?
   * Because we want to prevent naming conflicts as mentioned in
   * https://github.com/prisma/prisma-client-js/issues/707
   */
  export interface Prisma__SessionClient<T, Null = never, ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs, GlobalOmitOptions = {}> extends Prisma.PrismaPromise<T> {
    readonly [Symbol.toStringTag]: "PrismaPromise"
    user<T extends UserDefaultArgs<ExtArgs> = {}>(args?: Subset<T, UserDefaultArgs<ExtArgs>>): Prisma__UserClient<$Result.GetResult<Prisma.$UserPayload<ExtArgs>, T, "findUniqueOrThrow", GlobalOmitOptions> | Null, Null, ExtArgs, GlobalOmitOptions>
    /**
     * Attaches callbacks for the resolution and/or rejection of the Promise.
     * @param onfulfilled The callback to execute when the Promise is resolved.
     * @param onrejected The callback to execute when the Promise is rejected.
     * @returns A Promise for the completion of which ever callback is executed.
     */
    then<TResult1 = T, TResult2 = never>(onfulfilled?: ((value: T) => TResult1 | PromiseLike<TResult1>) | undefined | null, onrejected?: ((reason: any) => TResult2 | PromiseLike<TResult2>) | undefined | null): $Utils.JsPromise<TResult1 | TResult2>
    /**
     * Attaches a callback for only the rejection of the Promise.
     * @param onrejected The callback to execute when the Promise is rejected.
     * @returns A Promise for the completion of the callback.
     */
    catch<TResult = never>(onrejected?: ((reason: any) => TResult | PromiseLike<TResult>) | undefined | null): $Utils.JsPromise<T | TResult>
    /**
     * Attaches a callback that is invoked when the Promise is settled (fulfilled or rejected). The
     * resolved value cannot be modified from the callback.
     * @param onfinally The callback to execute when the Promise is settled (fulfilled or rejected).
     * @returns A Promise for the completion of the callback.
     */
    finally(onfinally?: (() => void) | undefined | null): $Utils.JsPromise<T>
  }




  /**
   * Fields of the Session model
   */
  interface SessionFieldRefs {
    readonly id: FieldRef<"Session", 'String'>
    readonly expiresAt: FieldRef<"Session", 'DateTime'>
    readonly token: FieldRef<"Session", 'String'>
    readonly createdAt: FieldRef<"Session", 'DateTime'>
    readonly updatedAt: FieldRef<"Session", 'DateTime'>
    readonly ipAddress: FieldRef<"Session", 'String'>
    readonly userAgent: FieldRef<"Session", 'String'>
    readonly userId: FieldRef<"Session", 'String'>
  }
    

  // Custom InputTypes
  /**
   * Session findUnique
   */
  export type SessionFindUniqueArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Session
     */
    select?: SessionSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Session
     */
    omit?: SessionOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: SessionInclude<ExtArgs> | null
    /**
     * Filter, which Session to fetch.
     */
    where: SessionWhereUniqueInput
  }

  /**
   * Session findUniqueOrThrow
   */
  export type SessionFindUniqueOrThrowArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Session
     */
    select?: SessionSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Session
     */
    omit?: SessionOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: SessionInclude<ExtArgs> | null
    /**
     * Filter, which Session to fetch.
     */
    where: SessionWhereUniqueInput
  }

  /**
   * Session findFirst
   */
  export type SessionFindFirstArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Session
     */
    select?: SessionSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Session
     */
    omit?: SessionOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: SessionInclude<ExtArgs> | null
    /**
     * Filter, which Session to fetch.
     */
    where?: SessionWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of Sessions to fetch.
     */
    orderBy?: SessionOrderByWithRelationInput | SessionOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for searching for Sessions.
     */
    cursor?: SessionWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` Sessions from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` Sessions.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/distinct Distinct Docs}
     * 
     * Filter by unique combinations of Sessions.
     */
    distinct?: SessionScalarFieldEnum | SessionScalarFieldEnum[]
  }

  /**
   * Session findFirstOrThrow
   */
  export type SessionFindFirstOrThrowArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Session
     */
    select?: SessionSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Session
     */
    omit?: SessionOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: SessionInclude<ExtArgs> | null
    /**
     * Filter, which Session to fetch.
     */
    where?: SessionWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of Sessions to fetch.
     */
    orderBy?: SessionOrderByWithRelationInput | SessionOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for searching for Sessions.
     */
    cursor?: SessionWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` Sessions from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` Sessions.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/distinct Distinct Docs}
     * 
     * Filter by unique combinations of Sessions.
     */
    distinct?: SessionScalarFieldEnum | SessionScalarFieldEnum[]
  }

  /**
   * Session findMany
   */
  export type SessionFindManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Session
     */
    select?: SessionSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Session
     */
    omit?: SessionOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: SessionInclude<ExtArgs> | null
    /**
     * Filter, which Sessions to fetch.
     */
    where?: SessionWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of Sessions to fetch.
     */
    orderBy?: SessionOrderByWithRelationInput | SessionOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for listing Sessions.
     */
    cursor?: SessionWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` Sessions from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` Sessions.
     */
    skip?: number
    distinct?: SessionScalarFieldEnum | SessionScalarFieldEnum[]
  }

  /**
   * Session create
   */
  export type SessionCreateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Session
     */
    select?: SessionSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Session
     */
    omit?: SessionOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: SessionInclude<ExtArgs> | null
    /**
     * The data needed to create a Session.
     */
    data: XOR<SessionCreateInput, SessionUncheckedCreateInput>
  }

  /**
   * Session createMany
   */
  export type SessionCreateManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * The data used to create many Sessions.
     */
    data: SessionCreateManyInput | SessionCreateManyInput[]
    skipDuplicates?: boolean
  }

  /**
   * Session createManyAndReturn
   */
  export type SessionCreateManyAndReturnArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Session
     */
    select?: SessionSelectCreateManyAndReturn<ExtArgs> | null
    /**
     * Omit specific fields from the Session
     */
    omit?: SessionOmit<ExtArgs> | null
    /**
     * The data used to create many Sessions.
     */
    data: SessionCreateManyInput | SessionCreateManyInput[]
    skipDuplicates?: boolean
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: SessionIncludeCreateManyAndReturn<ExtArgs> | null
  }

  /**
   * Session update
   */
  export type SessionUpdateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Session
     */
    select?: SessionSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Session
     */
    omit?: SessionOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: SessionInclude<ExtArgs> | null
    /**
     * The data needed to update a Session.
     */
    data: XOR<SessionUpdateInput, SessionUncheckedUpdateInput>
    /**
     * Choose, which Session to update.
     */
    where: SessionWhereUniqueInput
  }

  /**
   * Session updateMany
   */
  export type SessionUpdateManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * The data used to update Sessions.
     */
    data: XOR<SessionUpdateManyMutationInput, SessionUncheckedUpdateManyInput>
    /**
     * Filter which Sessions to update
     */
    where?: SessionWhereInput
    /**
     * Limit how many Sessions to update.
     */
    limit?: number
  }

  /**
   * Session updateManyAndReturn
   */
  export type SessionUpdateManyAndReturnArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Session
     */
    select?: SessionSelectUpdateManyAndReturn<ExtArgs> | null
    /**
     * Omit specific fields from the Session
     */
    omit?: SessionOmit<ExtArgs> | null
    /**
     * The data used to update Sessions.
     */
    data: XOR<SessionUpdateManyMutationInput, SessionUncheckedUpdateManyInput>
    /**
     * Filter which Sessions to update
     */
    where?: SessionWhereInput
    /**
     * Limit how many Sessions to update.
     */
    limit?: number
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: SessionIncludeUpdateManyAndReturn<ExtArgs> | null
  }

  /**
   * Session upsert
   */
  export type SessionUpsertArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Session
     */
    select?: SessionSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Session
     */
    omit?: SessionOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: SessionInclude<ExtArgs> | null
    /**
     * The filter to search for the Session to update in case it exists.
     */
    where: SessionWhereUniqueInput
    /**
     * In case the Session found by the `where` argument doesn't exist, create a new Session with this data.
     */
    create: XOR<SessionCreateInput, SessionUncheckedCreateInput>
    /**
     * In case the Session was found with the provided `where` argument, update it with this data.
     */
    update: XOR<SessionUpdateInput, SessionUncheckedUpdateInput>
  }

  /**
   * Session delete
   */
  export type SessionDeleteArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Session
     */
    select?: SessionSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Session
     */
    omit?: SessionOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: SessionInclude<ExtArgs> | null
    /**
     * Filter which Session to delete.
     */
    where: SessionWhereUniqueInput
  }

  /**
   * Session deleteMany
   */
  export type SessionDeleteManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Filter which Sessions to delete
     */
    where?: SessionWhereInput
    /**
     * Limit how many Sessions to delete.
     */
    limit?: number
  }

  /**
   * Session without action
   */
  export type SessionDefaultArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Session
     */
    select?: SessionSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Session
     */
    omit?: SessionOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: SessionInclude<ExtArgs> | null
  }


  /**
   * Model Account
   */

  export type AggregateAccount = {
    _count: AccountCountAggregateOutputType | null
    _min: AccountMinAggregateOutputType | null
    _max: AccountMaxAggregateOutputType | null
  }

  export type AccountMinAggregateOutputType = {
    id: string | null
    accountId: string | null
    providerId: string | null
    userId: string | null
    accessToken: string | null
    refreshToken: string | null
    idToken: string | null
    accessTokenExpiresAt: Date | null
    refreshTokenExpiresAt: Date | null
    scope: string | null
    password: string | null
    createdAt: Date | null
    updatedAt: Date | null
  }

  export type AccountMaxAggregateOutputType = {
    id: string | null
    accountId: string | null
    providerId: string | null
    userId: string | null
    accessToken: string | null
    refreshToken: string | null
    idToken: string | null
    accessTokenExpiresAt: Date | null
    refreshTokenExpiresAt: Date | null
    scope: string | null
    password: string | null
    createdAt: Date | null
    updatedAt: Date | null
  }

  export type AccountCountAggregateOutputType = {
    id: number
    accountId: number
    providerId: number
    userId: number
    accessToken: number
    refreshToken: number
    idToken: number
    accessTokenExpiresAt: number
    refreshTokenExpiresAt: number
    scope: number
    password: number
    createdAt: number
    updatedAt: number
    _all: number
  }


  export type AccountMinAggregateInputType = {
    id?: true
    accountId?: true
    providerId?: true
    userId?: true
    accessToken?: true
    refreshToken?: true
    idToken?: true
    accessTokenExpiresAt?: true
    refreshTokenExpiresAt?: true
    scope?: true
    password?: true
    createdAt?: true
    updatedAt?: true
  }

  export type AccountMaxAggregateInputType = {
    id?: true
    accountId?: true
    providerId?: true
    userId?: true
    accessToken?: true
    refreshToken?: true
    idToken?: true
    accessTokenExpiresAt?: true
    refreshTokenExpiresAt?: true
    scope?: true
    password?: true
    createdAt?: true
    updatedAt?: true
  }

  export type AccountCountAggregateInputType = {
    id?: true
    accountId?: true
    providerId?: true
    userId?: true
    accessToken?: true
    refreshToken?: true
    idToken?: true
    accessTokenExpiresAt?: true
    refreshTokenExpiresAt?: true
    scope?: true
    password?: true
    createdAt?: true
    updatedAt?: true
    _all?: true
  }

  export type AccountAggregateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Filter which Account to aggregate.
     */
    where?: AccountWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of Accounts to fetch.
     */
    orderBy?: AccountOrderByWithRelationInput | AccountOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the start position
     */
    cursor?: AccountWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` Accounts from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` Accounts.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Count returned Accounts
    **/
    _count?: true | AccountCountAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to find the minimum value
    **/
    _min?: AccountMinAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to find the maximum value
    **/
    _max?: AccountMaxAggregateInputType
  }

  export type GetAccountAggregateType<T extends AccountAggregateArgs> = {
        [P in keyof T & keyof AggregateAccount]: P extends '_count' | 'count'
      ? T[P] extends true
        ? number
        : GetScalarType<T[P], AggregateAccount[P]>
      : GetScalarType<T[P], AggregateAccount[P]>
  }




  export type AccountGroupByArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    where?: AccountWhereInput
    orderBy?: AccountOrderByWithAggregationInput | AccountOrderByWithAggregationInput[]
    by: AccountScalarFieldEnum[] | AccountScalarFieldEnum
    having?: AccountScalarWhereWithAggregatesInput
    take?: number
    skip?: number
    _count?: AccountCountAggregateInputType | true
    _min?: AccountMinAggregateInputType
    _max?: AccountMaxAggregateInputType
  }

  export type AccountGroupByOutputType = {
    id: string
    accountId: string
    providerId: string
    userId: string
    accessToken: string | null
    refreshToken: string | null
    idToken: string | null
    accessTokenExpiresAt: Date | null
    refreshTokenExpiresAt: Date | null
    scope: string | null
    password: string | null
    createdAt: Date
    updatedAt: Date
    _count: AccountCountAggregateOutputType | null
    _min: AccountMinAggregateOutputType | null
    _max: AccountMaxAggregateOutputType | null
  }

  type GetAccountGroupByPayload<T extends AccountGroupByArgs> = Prisma.PrismaPromise<
    Array<
      PickEnumerable<AccountGroupByOutputType, T['by']> &
        {
          [P in ((keyof T) & (keyof AccountGroupByOutputType))]: P extends '_count'
            ? T[P] extends boolean
              ? number
              : GetScalarType<T[P], AccountGroupByOutputType[P]>
            : GetScalarType<T[P], AccountGroupByOutputType[P]>
        }
      >
    >


  export type AccountSelect<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetSelect<{
    id?: boolean
    accountId?: boolean
    providerId?: boolean
    userId?: boolean
    accessToken?: boolean
    refreshToken?: boolean
    idToken?: boolean
    accessTokenExpiresAt?: boolean
    refreshTokenExpiresAt?: boolean
    scope?: boolean
    password?: boolean
    createdAt?: boolean
    updatedAt?: boolean
    user?: boolean | UserDefaultArgs<ExtArgs>
  }, ExtArgs["result"]["account"]>

  export type AccountSelectCreateManyAndReturn<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetSelect<{
    id?: boolean
    accountId?: boolean
    providerId?: boolean
    userId?: boolean
    accessToken?: boolean
    refreshToken?: boolean
    idToken?: boolean
    accessTokenExpiresAt?: boolean
    refreshTokenExpiresAt?: boolean
    scope?: boolean
    password?: boolean
    createdAt?: boolean
    updatedAt?: boolean
    user?: boolean | UserDefaultArgs<ExtArgs>
  }, ExtArgs["result"]["account"]>

  export type AccountSelectUpdateManyAndReturn<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetSelect<{
    id?: boolean
    accountId?: boolean
    providerId?: boolean
    userId?: boolean
    accessToken?: boolean
    refreshToken?: boolean
    idToken?: boolean
    accessTokenExpiresAt?: boolean
    refreshTokenExpiresAt?: boolean
    scope?: boolean
    password?: boolean
    createdAt?: boolean
    updatedAt?: boolean
    user?: boolean | UserDefaultArgs<ExtArgs>
  }, ExtArgs["result"]["account"]>

  export type AccountSelectScalar = {
    id?: boolean
    accountId?: boolean
    providerId?: boolean
    userId?: boolean
    accessToken?: boolean
    refreshToken?: boolean
    idToken?: boolean
    accessTokenExpiresAt?: boolean
    refreshTokenExpiresAt?: boolean
    scope?: boolean
    password?: boolean
    createdAt?: boolean
    updatedAt?: boolean
  }

  export type AccountOmit<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetOmit<"id" | "accountId" | "providerId" | "userId" | "accessToken" | "refreshToken" | "idToken" | "accessTokenExpiresAt" | "refreshTokenExpiresAt" | "scope" | "password" | "createdAt" | "updatedAt", ExtArgs["result"]["account"]>
  export type AccountInclude<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    user?: boolean | UserDefaultArgs<ExtArgs>
  }
  export type AccountIncludeCreateManyAndReturn<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    user?: boolean | UserDefaultArgs<ExtArgs>
  }
  export type AccountIncludeUpdateManyAndReturn<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    user?: boolean | UserDefaultArgs<ExtArgs>
  }

  export type $AccountPayload<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    name: "Account"
    objects: {
      user: Prisma.$UserPayload<ExtArgs>
    }
    scalars: $Extensions.GetPayloadResult<{
      id: string
      accountId: string
      providerId: string
      userId: string
      accessToken: string | null
      refreshToken: string | null
      idToken: string | null
      accessTokenExpiresAt: Date | null
      refreshTokenExpiresAt: Date | null
      scope: string | null
      password: string | null
      createdAt: Date
      updatedAt: Date
    }, ExtArgs["result"]["account"]>
    composites: {}
  }

  type AccountGetPayload<S extends boolean | null | undefined | AccountDefaultArgs> = $Result.GetResult<Prisma.$AccountPayload, S>

  type AccountCountArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> =
    Omit<AccountFindManyArgs, 'select' | 'include' | 'distinct' | 'omit'> & {
      select?: AccountCountAggregateInputType | true
    }

  export interface AccountDelegate<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs, GlobalOmitOptions = {}> {
    [K: symbol]: { types: Prisma.TypeMap<ExtArgs>['model']['Account'], meta: { name: 'Account' } }
    /**
     * Find zero or one Account that matches the filter.
     * @param {AccountFindUniqueArgs} args - Arguments to find a Account
     * @example
     * // Get one Account
     * const account = await prisma.account.findUnique({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findUnique<T extends AccountFindUniqueArgs>(args: SelectSubset<T, AccountFindUniqueArgs<ExtArgs>>): Prisma__AccountClient<$Result.GetResult<Prisma.$AccountPayload<ExtArgs>, T, "findUnique", GlobalOmitOptions> | null, null, ExtArgs, GlobalOmitOptions>

    /**
     * Find one Account that matches the filter or throw an error with `error.code='P2025'`
     * if no matches were found.
     * @param {AccountFindUniqueOrThrowArgs} args - Arguments to find a Account
     * @example
     * // Get one Account
     * const account = await prisma.account.findUniqueOrThrow({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findUniqueOrThrow<T extends AccountFindUniqueOrThrowArgs>(args: SelectSubset<T, AccountFindUniqueOrThrowArgs<ExtArgs>>): Prisma__AccountClient<$Result.GetResult<Prisma.$AccountPayload<ExtArgs>, T, "findUniqueOrThrow", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Find the first Account that matches the filter.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {AccountFindFirstArgs} args - Arguments to find a Account
     * @example
     * // Get one Account
     * const account = await prisma.account.findFirst({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findFirst<T extends AccountFindFirstArgs>(args?: SelectSubset<T, AccountFindFirstArgs<ExtArgs>>): Prisma__AccountClient<$Result.GetResult<Prisma.$AccountPayload<ExtArgs>, T, "findFirst", GlobalOmitOptions> | null, null, ExtArgs, GlobalOmitOptions>

    /**
     * Find the first Account that matches the filter or
     * throw `PrismaKnownClientError` with `P2025` code if no matches were found.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {AccountFindFirstOrThrowArgs} args - Arguments to find a Account
     * @example
     * // Get one Account
     * const account = await prisma.account.findFirstOrThrow({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findFirstOrThrow<T extends AccountFindFirstOrThrowArgs>(args?: SelectSubset<T, AccountFindFirstOrThrowArgs<ExtArgs>>): Prisma__AccountClient<$Result.GetResult<Prisma.$AccountPayload<ExtArgs>, T, "findFirstOrThrow", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Find zero or more Accounts that matches the filter.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {AccountFindManyArgs} args - Arguments to filter and select certain fields only.
     * @example
     * // Get all Accounts
     * const accounts = await prisma.account.findMany()
     * 
     * // Get first 10 Accounts
     * const accounts = await prisma.account.findMany({ take: 10 })
     * 
     * // Only select the `id`
     * const accountWithIdOnly = await prisma.account.findMany({ select: { id: true } })
     * 
     */
    findMany<T extends AccountFindManyArgs>(args?: SelectSubset<T, AccountFindManyArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$AccountPayload<ExtArgs>, T, "findMany", GlobalOmitOptions>>

    /**
     * Create a Account.
     * @param {AccountCreateArgs} args - Arguments to create a Account.
     * @example
     * // Create one Account
     * const Account = await prisma.account.create({
     *   data: {
     *     // ... data to create a Account
     *   }
     * })
     * 
     */
    create<T extends AccountCreateArgs>(args: SelectSubset<T, AccountCreateArgs<ExtArgs>>): Prisma__AccountClient<$Result.GetResult<Prisma.$AccountPayload<ExtArgs>, T, "create", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Create many Accounts.
     * @param {AccountCreateManyArgs} args - Arguments to create many Accounts.
     * @example
     * // Create many Accounts
     * const account = await prisma.account.createMany({
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     *     
     */
    createMany<T extends AccountCreateManyArgs>(args?: SelectSubset<T, AccountCreateManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Create many Accounts and returns the data saved in the database.
     * @param {AccountCreateManyAndReturnArgs} args - Arguments to create many Accounts.
     * @example
     * // Create many Accounts
     * const account = await prisma.account.createManyAndReturn({
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * 
     * // Create many Accounts and only return the `id`
     * const accountWithIdOnly = await prisma.account.createManyAndReturn({
     *   select: { id: true },
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * 
     */
    createManyAndReturn<T extends AccountCreateManyAndReturnArgs>(args?: SelectSubset<T, AccountCreateManyAndReturnArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$AccountPayload<ExtArgs>, T, "createManyAndReturn", GlobalOmitOptions>>

    /**
     * Delete a Account.
     * @param {AccountDeleteArgs} args - Arguments to delete one Account.
     * @example
     * // Delete one Account
     * const Account = await prisma.account.delete({
     *   where: {
     *     // ... filter to delete one Account
     *   }
     * })
     * 
     */
    delete<T extends AccountDeleteArgs>(args: SelectSubset<T, AccountDeleteArgs<ExtArgs>>): Prisma__AccountClient<$Result.GetResult<Prisma.$AccountPayload<ExtArgs>, T, "delete", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Update one Account.
     * @param {AccountUpdateArgs} args - Arguments to update one Account.
     * @example
     * // Update one Account
     * const account = await prisma.account.update({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: {
     *     // ... provide data here
     *   }
     * })
     * 
     */
    update<T extends AccountUpdateArgs>(args: SelectSubset<T, AccountUpdateArgs<ExtArgs>>): Prisma__AccountClient<$Result.GetResult<Prisma.$AccountPayload<ExtArgs>, T, "update", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Delete zero or more Accounts.
     * @param {AccountDeleteManyArgs} args - Arguments to filter Accounts to delete.
     * @example
     * // Delete a few Accounts
     * const { count } = await prisma.account.deleteMany({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     * 
     */
    deleteMany<T extends AccountDeleteManyArgs>(args?: SelectSubset<T, AccountDeleteManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Update zero or more Accounts.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {AccountUpdateManyArgs} args - Arguments to update one or more rows.
     * @example
     * // Update many Accounts
     * const account = await prisma.account.updateMany({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: {
     *     // ... provide data here
     *   }
     * })
     * 
     */
    updateMany<T extends AccountUpdateManyArgs>(args: SelectSubset<T, AccountUpdateManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Update zero or more Accounts and returns the data updated in the database.
     * @param {AccountUpdateManyAndReturnArgs} args - Arguments to update many Accounts.
     * @example
     * // Update many Accounts
     * const account = await prisma.account.updateManyAndReturn({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * 
     * // Update zero or more Accounts and only return the `id`
     * const accountWithIdOnly = await prisma.account.updateManyAndReturn({
     *   select: { id: true },
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * 
     */
    updateManyAndReturn<T extends AccountUpdateManyAndReturnArgs>(args: SelectSubset<T, AccountUpdateManyAndReturnArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$AccountPayload<ExtArgs>, T, "updateManyAndReturn", GlobalOmitOptions>>

    /**
     * Create or update one Account.
     * @param {AccountUpsertArgs} args - Arguments to update or create a Account.
     * @example
     * // Update or create a Account
     * const account = await prisma.account.upsert({
     *   create: {
     *     // ... data to create a Account
     *   },
     *   update: {
     *     // ... in case it already exists, update
     *   },
     *   where: {
     *     // ... the filter for the Account we want to update
     *   }
     * })
     */
    upsert<T extends AccountUpsertArgs>(args: SelectSubset<T, AccountUpsertArgs<ExtArgs>>): Prisma__AccountClient<$Result.GetResult<Prisma.$AccountPayload<ExtArgs>, T, "upsert", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>


    /**
     * Count the number of Accounts.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {AccountCountArgs} args - Arguments to filter Accounts to count.
     * @example
     * // Count the number of Accounts
     * const count = await prisma.account.count({
     *   where: {
     *     // ... the filter for the Accounts we want to count
     *   }
     * })
    **/
    count<T extends AccountCountArgs>(
      args?: Subset<T, AccountCountArgs>,
    ): Prisma.PrismaPromise<
      T extends $Utils.Record<'select', any>
        ? T['select'] extends true
          ? number
          : GetScalarType<T['select'], AccountCountAggregateOutputType>
        : number
    >

    /**
     * Allows you to perform aggregations operations on a Account.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {AccountAggregateArgs} args - Select which aggregations you would like to apply and on what fields.
     * @example
     * // Ordered by age ascending
     * // Where email contains prisma.io
     * // Limited to the 10 users
     * const aggregations = await prisma.user.aggregate({
     *   _avg: {
     *     age: true,
     *   },
     *   where: {
     *     email: {
     *       contains: "prisma.io",
     *     },
     *   },
     *   orderBy: {
     *     age: "asc",
     *   },
     *   take: 10,
     * })
    **/
    aggregate<T extends AccountAggregateArgs>(args: Subset<T, AccountAggregateArgs>): Prisma.PrismaPromise<GetAccountAggregateType<T>>

    /**
     * Group by Account.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {AccountGroupByArgs} args - Group by arguments.
     * @example
     * // Group by city, order by createdAt, get count
     * const result = await prisma.user.groupBy({
     *   by: ['city', 'createdAt'],
     *   orderBy: {
     *     createdAt: true
     *   },
     *   _count: {
     *     _all: true
     *   },
     * })
     * 
    **/
    groupBy<
      T extends AccountGroupByArgs,
      HasSelectOrTake extends Or<
        Extends<'skip', Keys<T>>,
        Extends<'take', Keys<T>>
      >,
      OrderByArg extends True extends HasSelectOrTake
        ? { orderBy: AccountGroupByArgs['orderBy'] }
        : { orderBy?: AccountGroupByArgs['orderBy'] },
      OrderFields extends ExcludeUnderscoreKeys<Keys<MaybeTupleToUnion<T['orderBy']>>>,
      ByFields extends MaybeTupleToUnion<T['by']>,
      ByValid extends Has<ByFields, OrderFields>,
      HavingFields extends GetHavingFields<T['having']>,
      HavingValid extends Has<ByFields, HavingFields>,
      ByEmpty extends T['by'] extends never[] ? True : False,
      InputErrors extends ByEmpty extends True
      ? `Error: "by" must not be empty.`
      : HavingValid extends False
      ? {
          [P in HavingFields]: P extends ByFields
            ? never
            : P extends string
            ? `Error: Field "${P}" used in "having" needs to be provided in "by".`
            : [
                Error,
                'Field ',
                P,
                ` in "having" needs to be provided in "by"`,
              ]
        }[HavingFields]
      : 'take' extends Keys<T>
      ? 'orderBy' extends Keys<T>
        ? ByValid extends True
          ? {}
          : {
              [P in OrderFields]: P extends ByFields
                ? never
                : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
            }[OrderFields]
        : 'Error: If you provide "take", you also need to provide "orderBy"'
      : 'skip' extends Keys<T>
      ? 'orderBy' extends Keys<T>
        ? ByValid extends True
          ? {}
          : {
              [P in OrderFields]: P extends ByFields
                ? never
                : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
            }[OrderFields]
        : 'Error: If you provide "skip", you also need to provide "orderBy"'
      : ByValid extends True
      ? {}
      : {
          [P in OrderFields]: P extends ByFields
            ? never
            : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
        }[OrderFields]
    >(args: SubsetIntersection<T, AccountGroupByArgs, OrderByArg> & InputErrors): {} extends InputErrors ? GetAccountGroupByPayload<T> : Prisma.PrismaPromise<InputErrors>
  /**
   * Fields of the Account model
   */
  readonly fields: AccountFieldRefs;
  }

  /**
   * The delegate class that acts as a "Promise-like" for Account.
   * Why is this prefixed with `Prisma__`?
   * Because we want to prevent naming conflicts as mentioned in
   * https://github.com/prisma/prisma-client-js/issues/707
   */
  export interface Prisma__AccountClient<T, Null = never, ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs, GlobalOmitOptions = {}> extends Prisma.PrismaPromise<T> {
    readonly [Symbol.toStringTag]: "PrismaPromise"
    user<T extends UserDefaultArgs<ExtArgs> = {}>(args?: Subset<T, UserDefaultArgs<ExtArgs>>): Prisma__UserClient<$Result.GetResult<Prisma.$UserPayload<ExtArgs>, T, "findUniqueOrThrow", GlobalOmitOptions> | Null, Null, ExtArgs, GlobalOmitOptions>
    /**
     * Attaches callbacks for the resolution and/or rejection of the Promise.
     * @param onfulfilled The callback to execute when the Promise is resolved.
     * @param onrejected The callback to execute when the Promise is rejected.
     * @returns A Promise for the completion of which ever callback is executed.
     */
    then<TResult1 = T, TResult2 = never>(onfulfilled?: ((value: T) => TResult1 | PromiseLike<TResult1>) | undefined | null, onrejected?: ((reason: any) => TResult2 | PromiseLike<TResult2>) | undefined | null): $Utils.JsPromise<TResult1 | TResult2>
    /**
     * Attaches a callback for only the rejection of the Promise.
     * @param onrejected The callback to execute when the Promise is rejected.
     * @returns A Promise for the completion of the callback.
     */
    catch<TResult = never>(onrejected?: ((reason: any) => TResult | PromiseLike<TResult>) | undefined | null): $Utils.JsPromise<T | TResult>
    /**
     * Attaches a callback that is invoked when the Promise is settled (fulfilled or rejected). The
     * resolved value cannot be modified from the callback.
     * @param onfinally The callback to execute when the Promise is settled (fulfilled or rejected).
     * @returns A Promise for the completion of the callback.
     */
    finally(onfinally?: (() => void) | undefined | null): $Utils.JsPromise<T>
  }




  /**
   * Fields of the Account model
   */
  interface AccountFieldRefs {
    readonly id: FieldRef<"Account", 'String'>
    readonly accountId: FieldRef<"Account", 'String'>
    readonly providerId: FieldRef<"Account", 'String'>
    readonly userId: FieldRef<"Account", 'String'>
    readonly accessToken: FieldRef<"Account", 'String'>
    readonly refreshToken: FieldRef<"Account", 'String'>
    readonly idToken: FieldRef<"Account", 'String'>
    readonly accessTokenExpiresAt: FieldRef<"Account", 'DateTime'>
    readonly refreshTokenExpiresAt: FieldRef<"Account", 'DateTime'>
    readonly scope: FieldRef<"Account", 'String'>
    readonly password: FieldRef<"Account", 'String'>
    readonly createdAt: FieldRef<"Account", 'DateTime'>
    readonly updatedAt: FieldRef<"Account", 'DateTime'>
  }
    

  // Custom InputTypes
  /**
   * Account findUnique
   */
  export type AccountFindUniqueArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Account
     */
    select?: AccountSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Account
     */
    omit?: AccountOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: AccountInclude<ExtArgs> | null
    /**
     * Filter, which Account to fetch.
     */
    where: AccountWhereUniqueInput
  }

  /**
   * Account findUniqueOrThrow
   */
  export type AccountFindUniqueOrThrowArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Account
     */
    select?: AccountSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Account
     */
    omit?: AccountOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: AccountInclude<ExtArgs> | null
    /**
     * Filter, which Account to fetch.
     */
    where: AccountWhereUniqueInput
  }

  /**
   * Account findFirst
   */
  export type AccountFindFirstArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Account
     */
    select?: AccountSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Account
     */
    omit?: AccountOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: AccountInclude<ExtArgs> | null
    /**
     * Filter, which Account to fetch.
     */
    where?: AccountWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of Accounts to fetch.
     */
    orderBy?: AccountOrderByWithRelationInput | AccountOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for searching for Accounts.
     */
    cursor?: AccountWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` Accounts from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` Accounts.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/distinct Distinct Docs}
     * 
     * Filter by unique combinations of Accounts.
     */
    distinct?: AccountScalarFieldEnum | AccountScalarFieldEnum[]
  }

  /**
   * Account findFirstOrThrow
   */
  export type AccountFindFirstOrThrowArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Account
     */
    select?: AccountSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Account
     */
    omit?: AccountOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: AccountInclude<ExtArgs> | null
    /**
     * Filter, which Account to fetch.
     */
    where?: AccountWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of Accounts to fetch.
     */
    orderBy?: AccountOrderByWithRelationInput | AccountOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for searching for Accounts.
     */
    cursor?: AccountWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` Accounts from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` Accounts.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/distinct Distinct Docs}
     * 
     * Filter by unique combinations of Accounts.
     */
    distinct?: AccountScalarFieldEnum | AccountScalarFieldEnum[]
  }

  /**
   * Account findMany
   */
  export type AccountFindManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Account
     */
    select?: AccountSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Account
     */
    omit?: AccountOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: AccountInclude<ExtArgs> | null
    /**
     * Filter, which Accounts to fetch.
     */
    where?: AccountWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of Accounts to fetch.
     */
    orderBy?: AccountOrderByWithRelationInput | AccountOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for listing Accounts.
     */
    cursor?: AccountWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` Accounts from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` Accounts.
     */
    skip?: number
    distinct?: AccountScalarFieldEnum | AccountScalarFieldEnum[]
  }

  /**
   * Account create
   */
  export type AccountCreateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Account
     */
    select?: AccountSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Account
     */
    omit?: AccountOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: AccountInclude<ExtArgs> | null
    /**
     * The data needed to create a Account.
     */
    data: XOR<AccountCreateInput, AccountUncheckedCreateInput>
  }

  /**
   * Account createMany
   */
  export type AccountCreateManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * The data used to create many Accounts.
     */
    data: AccountCreateManyInput | AccountCreateManyInput[]
    skipDuplicates?: boolean
  }

  /**
   * Account createManyAndReturn
   */
  export type AccountCreateManyAndReturnArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Account
     */
    select?: AccountSelectCreateManyAndReturn<ExtArgs> | null
    /**
     * Omit specific fields from the Account
     */
    omit?: AccountOmit<ExtArgs> | null
    /**
     * The data used to create many Accounts.
     */
    data: AccountCreateManyInput | AccountCreateManyInput[]
    skipDuplicates?: boolean
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: AccountIncludeCreateManyAndReturn<ExtArgs> | null
  }

  /**
   * Account update
   */
  export type AccountUpdateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Account
     */
    select?: AccountSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Account
     */
    omit?: AccountOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: AccountInclude<ExtArgs> | null
    /**
     * The data needed to update a Account.
     */
    data: XOR<AccountUpdateInput, AccountUncheckedUpdateInput>
    /**
     * Choose, which Account to update.
     */
    where: AccountWhereUniqueInput
  }

  /**
   * Account updateMany
   */
  export type AccountUpdateManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * The data used to update Accounts.
     */
    data: XOR<AccountUpdateManyMutationInput, AccountUncheckedUpdateManyInput>
    /**
     * Filter which Accounts to update
     */
    where?: AccountWhereInput
    /**
     * Limit how many Accounts to update.
     */
    limit?: number
  }

  /**
   * Account updateManyAndReturn
   */
  export type AccountUpdateManyAndReturnArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Account
     */
    select?: AccountSelectUpdateManyAndReturn<ExtArgs> | null
    /**
     * Omit specific fields from the Account
     */
    omit?: AccountOmit<ExtArgs> | null
    /**
     * The data used to update Accounts.
     */
    data: XOR<AccountUpdateManyMutationInput, AccountUncheckedUpdateManyInput>
    /**
     * Filter which Accounts to update
     */
    where?: AccountWhereInput
    /**
     * Limit how many Accounts to update.
     */
    limit?: number
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: AccountIncludeUpdateManyAndReturn<ExtArgs> | null
  }

  /**
   * Account upsert
   */
  export type AccountUpsertArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Account
     */
    select?: AccountSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Account
     */
    omit?: AccountOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: AccountInclude<ExtArgs> | null
    /**
     * The filter to search for the Account to update in case it exists.
     */
    where: AccountWhereUniqueInput
    /**
     * In case the Account found by the `where` argument doesn't exist, create a new Account with this data.
     */
    create: XOR<AccountCreateInput, AccountUncheckedCreateInput>
    /**
     * In case the Account was found with the provided `where` argument, update it with this data.
     */
    update: XOR<AccountUpdateInput, AccountUncheckedUpdateInput>
  }

  /**
   * Account delete
   */
  export type AccountDeleteArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Account
     */
    select?: AccountSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Account
     */
    omit?: AccountOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: AccountInclude<ExtArgs> | null
    /**
     * Filter which Account to delete.
     */
    where: AccountWhereUniqueInput
  }

  /**
   * Account deleteMany
   */
  export type AccountDeleteManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Filter which Accounts to delete
     */
    where?: AccountWhereInput
    /**
     * Limit how many Accounts to delete.
     */
    limit?: number
  }

  /**
   * Account without action
   */
  export type AccountDefaultArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Account
     */
    select?: AccountSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Account
     */
    omit?: AccountOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: AccountInclude<ExtArgs> | null
  }


  /**
   * Model Verification
   */

  export type AggregateVerification = {
    _count: VerificationCountAggregateOutputType | null
    _min: VerificationMinAggregateOutputType | null
    _max: VerificationMaxAggregateOutputType | null
  }

  export type VerificationMinAggregateOutputType = {
    id: string | null
    identifier: string | null
    value: string | null
    expiresAt: Date | null
    createdAt: Date | null
    updatedAt: Date | null
  }

  export type VerificationMaxAggregateOutputType = {
    id: string | null
    identifier: string | null
    value: string | null
    expiresAt: Date | null
    createdAt: Date | null
    updatedAt: Date | null
  }

  export type VerificationCountAggregateOutputType = {
    id: number
    identifier: number
    value: number
    expiresAt: number
    createdAt: number
    updatedAt: number
    _all: number
  }


  export type VerificationMinAggregateInputType = {
    id?: true
    identifier?: true
    value?: true
    expiresAt?: true
    createdAt?: true
    updatedAt?: true
  }

  export type VerificationMaxAggregateInputType = {
    id?: true
    identifier?: true
    value?: true
    expiresAt?: true
    createdAt?: true
    updatedAt?: true
  }

  export type VerificationCountAggregateInputType = {
    id?: true
    identifier?: true
    value?: true
    expiresAt?: true
    createdAt?: true
    updatedAt?: true
    _all?: true
  }

  export type VerificationAggregateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Filter which Verification to aggregate.
     */
    where?: VerificationWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of Verifications to fetch.
     */
    orderBy?: VerificationOrderByWithRelationInput | VerificationOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the start position
     */
    cursor?: VerificationWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` Verifications from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` Verifications.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Count returned Verifications
    **/
    _count?: true | VerificationCountAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to find the minimum value
    **/
    _min?: VerificationMinAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to find the maximum value
    **/
    _max?: VerificationMaxAggregateInputType
  }

  export type GetVerificationAggregateType<T extends VerificationAggregateArgs> = {
        [P in keyof T & keyof AggregateVerification]: P extends '_count' | 'count'
      ? T[P] extends true
        ? number
        : GetScalarType<T[P], AggregateVerification[P]>
      : GetScalarType<T[P], AggregateVerification[P]>
  }




  export type VerificationGroupByArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    where?: VerificationWhereInput
    orderBy?: VerificationOrderByWithAggregationInput | VerificationOrderByWithAggregationInput[]
    by: VerificationScalarFieldEnum[] | VerificationScalarFieldEnum
    having?: VerificationScalarWhereWithAggregatesInput
    take?: number
    skip?: number
    _count?: VerificationCountAggregateInputType | true
    _min?: VerificationMinAggregateInputType
    _max?: VerificationMaxAggregateInputType
  }

  export type VerificationGroupByOutputType = {
    id: string
    identifier: string
    value: string
    expiresAt: Date
    createdAt: Date
    updatedAt: Date
    _count: VerificationCountAggregateOutputType | null
    _min: VerificationMinAggregateOutputType | null
    _max: VerificationMaxAggregateOutputType | null
  }

  type GetVerificationGroupByPayload<T extends VerificationGroupByArgs> = Prisma.PrismaPromise<
    Array<
      PickEnumerable<VerificationGroupByOutputType, T['by']> &
        {
          [P in ((keyof T) & (keyof VerificationGroupByOutputType))]: P extends '_count'
            ? T[P] extends boolean
              ? number
              : GetScalarType<T[P], VerificationGroupByOutputType[P]>
            : GetScalarType<T[P], VerificationGroupByOutputType[P]>
        }
      >
    >


  export type VerificationSelect<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetSelect<{
    id?: boolean
    identifier?: boolean
    value?: boolean
    expiresAt?: boolean
    createdAt?: boolean
    updatedAt?: boolean
  }, ExtArgs["result"]["verification"]>

  export type VerificationSelectCreateManyAndReturn<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetSelect<{
    id?: boolean
    identifier?: boolean
    value?: boolean
    expiresAt?: boolean
    createdAt?: boolean
    updatedAt?: boolean
  }, ExtArgs["result"]["verification"]>

  export type VerificationSelectUpdateManyAndReturn<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetSelect<{
    id?: boolean
    identifier?: boolean
    value?: boolean
    expiresAt?: boolean
    createdAt?: boolean
    updatedAt?: boolean
  }, ExtArgs["result"]["verification"]>

  export type VerificationSelectScalar = {
    id?: boolean
    identifier?: boolean
    value?: boolean
    expiresAt?: boolean
    createdAt?: boolean
    updatedAt?: boolean
  }

  export type VerificationOmit<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetOmit<"id" | "identifier" | "value" | "expiresAt" | "createdAt" | "updatedAt", ExtArgs["result"]["verification"]>

  export type $VerificationPayload<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    name: "Verification"
    objects: {}
    scalars: $Extensions.GetPayloadResult<{
      id: string
      identifier: string
      value: string
      expiresAt: Date
      createdAt: Date
      updatedAt: Date
    }, ExtArgs["result"]["verification"]>
    composites: {}
  }

  type VerificationGetPayload<S extends boolean | null | undefined | VerificationDefaultArgs> = $Result.GetResult<Prisma.$VerificationPayload, S>

  type VerificationCountArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> =
    Omit<VerificationFindManyArgs, 'select' | 'include' | 'distinct' | 'omit'> & {
      select?: VerificationCountAggregateInputType | true
    }

  export interface VerificationDelegate<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs, GlobalOmitOptions = {}> {
    [K: symbol]: { types: Prisma.TypeMap<ExtArgs>['model']['Verification'], meta: { name: 'Verification' } }
    /**
     * Find zero or one Verification that matches the filter.
     * @param {VerificationFindUniqueArgs} args - Arguments to find a Verification
     * @example
     * // Get one Verification
     * const verification = await prisma.verification.findUnique({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findUnique<T extends VerificationFindUniqueArgs>(args: SelectSubset<T, VerificationFindUniqueArgs<ExtArgs>>): Prisma__VerificationClient<$Result.GetResult<Prisma.$VerificationPayload<ExtArgs>, T, "findUnique", GlobalOmitOptions> | null, null, ExtArgs, GlobalOmitOptions>

    /**
     * Find one Verification that matches the filter or throw an error with `error.code='P2025'`
     * if no matches were found.
     * @param {VerificationFindUniqueOrThrowArgs} args - Arguments to find a Verification
     * @example
     * // Get one Verification
     * const verification = await prisma.verification.findUniqueOrThrow({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findUniqueOrThrow<T extends VerificationFindUniqueOrThrowArgs>(args: SelectSubset<T, VerificationFindUniqueOrThrowArgs<ExtArgs>>): Prisma__VerificationClient<$Result.GetResult<Prisma.$VerificationPayload<ExtArgs>, T, "findUniqueOrThrow", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Find the first Verification that matches the filter.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {VerificationFindFirstArgs} args - Arguments to find a Verification
     * @example
     * // Get one Verification
     * const verification = await prisma.verification.findFirst({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findFirst<T extends VerificationFindFirstArgs>(args?: SelectSubset<T, VerificationFindFirstArgs<ExtArgs>>): Prisma__VerificationClient<$Result.GetResult<Prisma.$VerificationPayload<ExtArgs>, T, "findFirst", GlobalOmitOptions> | null, null, ExtArgs, GlobalOmitOptions>

    /**
     * Find the first Verification that matches the filter or
     * throw `PrismaKnownClientError` with `P2025` code if no matches were found.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {VerificationFindFirstOrThrowArgs} args - Arguments to find a Verification
     * @example
     * // Get one Verification
     * const verification = await prisma.verification.findFirstOrThrow({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findFirstOrThrow<T extends VerificationFindFirstOrThrowArgs>(args?: SelectSubset<T, VerificationFindFirstOrThrowArgs<ExtArgs>>): Prisma__VerificationClient<$Result.GetResult<Prisma.$VerificationPayload<ExtArgs>, T, "findFirstOrThrow", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Find zero or more Verifications that matches the filter.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {VerificationFindManyArgs} args - Arguments to filter and select certain fields only.
     * @example
     * // Get all Verifications
     * const verifications = await prisma.verification.findMany()
     * 
     * // Get first 10 Verifications
     * const verifications = await prisma.verification.findMany({ take: 10 })
     * 
     * // Only select the `id`
     * const verificationWithIdOnly = await prisma.verification.findMany({ select: { id: true } })
     * 
     */
    findMany<T extends VerificationFindManyArgs>(args?: SelectSubset<T, VerificationFindManyArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$VerificationPayload<ExtArgs>, T, "findMany", GlobalOmitOptions>>

    /**
     * Create a Verification.
     * @param {VerificationCreateArgs} args - Arguments to create a Verification.
     * @example
     * // Create one Verification
     * const Verification = await prisma.verification.create({
     *   data: {
     *     // ... data to create a Verification
     *   }
     * })
     * 
     */
    create<T extends VerificationCreateArgs>(args: SelectSubset<T, VerificationCreateArgs<ExtArgs>>): Prisma__VerificationClient<$Result.GetResult<Prisma.$VerificationPayload<ExtArgs>, T, "create", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Create many Verifications.
     * @param {VerificationCreateManyArgs} args - Arguments to create many Verifications.
     * @example
     * // Create many Verifications
     * const verification = await prisma.verification.createMany({
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     *     
     */
    createMany<T extends VerificationCreateManyArgs>(args?: SelectSubset<T, VerificationCreateManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Create many Verifications and returns the data saved in the database.
     * @param {VerificationCreateManyAndReturnArgs} args - Arguments to create many Verifications.
     * @example
     * // Create many Verifications
     * const verification = await prisma.verification.createManyAndReturn({
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * 
     * // Create many Verifications and only return the `id`
     * const verificationWithIdOnly = await prisma.verification.createManyAndReturn({
     *   select: { id: true },
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * 
     */
    createManyAndReturn<T extends VerificationCreateManyAndReturnArgs>(args?: SelectSubset<T, VerificationCreateManyAndReturnArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$VerificationPayload<ExtArgs>, T, "createManyAndReturn", GlobalOmitOptions>>

    /**
     * Delete a Verification.
     * @param {VerificationDeleteArgs} args - Arguments to delete one Verification.
     * @example
     * // Delete one Verification
     * const Verification = await prisma.verification.delete({
     *   where: {
     *     // ... filter to delete one Verification
     *   }
     * })
     * 
     */
    delete<T extends VerificationDeleteArgs>(args: SelectSubset<T, VerificationDeleteArgs<ExtArgs>>): Prisma__VerificationClient<$Result.GetResult<Prisma.$VerificationPayload<ExtArgs>, T, "delete", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Update one Verification.
     * @param {VerificationUpdateArgs} args - Arguments to update one Verification.
     * @example
     * // Update one Verification
     * const verification = await prisma.verification.update({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: {
     *     // ... provide data here
     *   }
     * })
     * 
     */
    update<T extends VerificationUpdateArgs>(args: SelectSubset<T, VerificationUpdateArgs<ExtArgs>>): Prisma__VerificationClient<$Result.GetResult<Prisma.$VerificationPayload<ExtArgs>, T, "update", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Delete zero or more Verifications.
     * @param {VerificationDeleteManyArgs} args - Arguments to filter Verifications to delete.
     * @example
     * // Delete a few Verifications
     * const { count } = await prisma.verification.deleteMany({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     * 
     */
    deleteMany<T extends VerificationDeleteManyArgs>(args?: SelectSubset<T, VerificationDeleteManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Update zero or more Verifications.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {VerificationUpdateManyArgs} args - Arguments to update one or more rows.
     * @example
     * // Update many Verifications
     * const verification = await prisma.verification.updateMany({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: {
     *     // ... provide data here
     *   }
     * })
     * 
     */
    updateMany<T extends VerificationUpdateManyArgs>(args: SelectSubset<T, VerificationUpdateManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Update zero or more Verifications and returns the data updated in the database.
     * @param {VerificationUpdateManyAndReturnArgs} args - Arguments to update many Verifications.
     * @example
     * // Update many Verifications
     * const verification = await prisma.verification.updateManyAndReturn({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * 
     * // Update zero or more Verifications and only return the `id`
     * const verificationWithIdOnly = await prisma.verification.updateManyAndReturn({
     *   select: { id: true },
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * 
     */
    updateManyAndReturn<T extends VerificationUpdateManyAndReturnArgs>(args: SelectSubset<T, VerificationUpdateManyAndReturnArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$VerificationPayload<ExtArgs>, T, "updateManyAndReturn", GlobalOmitOptions>>

    /**
     * Create or update one Verification.
     * @param {VerificationUpsertArgs} args - Arguments to update or create a Verification.
     * @example
     * // Update or create a Verification
     * const verification = await prisma.verification.upsert({
     *   create: {
     *     // ... data to create a Verification
     *   },
     *   update: {
     *     // ... in case it already exists, update
     *   },
     *   where: {
     *     // ... the filter for the Verification we want to update
     *   }
     * })
     */
    upsert<T extends VerificationUpsertArgs>(args: SelectSubset<T, VerificationUpsertArgs<ExtArgs>>): Prisma__VerificationClient<$Result.GetResult<Prisma.$VerificationPayload<ExtArgs>, T, "upsert", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>


    /**
     * Count the number of Verifications.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {VerificationCountArgs} args - Arguments to filter Verifications to count.
     * @example
     * // Count the number of Verifications
     * const count = await prisma.verification.count({
     *   where: {
     *     // ... the filter for the Verifications we want to count
     *   }
     * })
    **/
    count<T extends VerificationCountArgs>(
      args?: Subset<T, VerificationCountArgs>,
    ): Prisma.PrismaPromise<
      T extends $Utils.Record<'select', any>
        ? T['select'] extends true
          ? number
          : GetScalarType<T['select'], VerificationCountAggregateOutputType>
        : number
    >

    /**
     * Allows you to perform aggregations operations on a Verification.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {VerificationAggregateArgs} args - Select which aggregations you would like to apply and on what fields.
     * @example
     * // Ordered by age ascending
     * // Where email contains prisma.io
     * // Limited to the 10 users
     * const aggregations = await prisma.user.aggregate({
     *   _avg: {
     *     age: true,
     *   },
     *   where: {
     *     email: {
     *       contains: "prisma.io",
     *     },
     *   },
     *   orderBy: {
     *     age: "asc",
     *   },
     *   take: 10,
     * })
    **/
    aggregate<T extends VerificationAggregateArgs>(args: Subset<T, VerificationAggregateArgs>): Prisma.PrismaPromise<GetVerificationAggregateType<T>>

    /**
     * Group by Verification.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {VerificationGroupByArgs} args - Group by arguments.
     * @example
     * // Group by city, order by createdAt, get count
     * const result = await prisma.user.groupBy({
     *   by: ['city', 'createdAt'],
     *   orderBy: {
     *     createdAt: true
     *   },
     *   _count: {
     *     _all: true
     *   },
     * })
     * 
    **/
    groupBy<
      T extends VerificationGroupByArgs,
      HasSelectOrTake extends Or<
        Extends<'skip', Keys<T>>,
        Extends<'take', Keys<T>>
      >,
      OrderByArg extends True extends HasSelectOrTake
        ? { orderBy: VerificationGroupByArgs['orderBy'] }
        : { orderBy?: VerificationGroupByArgs['orderBy'] },
      OrderFields extends ExcludeUnderscoreKeys<Keys<MaybeTupleToUnion<T['orderBy']>>>,
      ByFields extends MaybeTupleToUnion<T['by']>,
      ByValid extends Has<ByFields, OrderFields>,
      HavingFields extends GetHavingFields<T['having']>,
      HavingValid extends Has<ByFields, HavingFields>,
      ByEmpty extends T['by'] extends never[] ? True : False,
      InputErrors extends ByEmpty extends True
      ? `Error: "by" must not be empty.`
      : HavingValid extends False
      ? {
          [P in HavingFields]: P extends ByFields
            ? never
            : P extends string
            ? `Error: Field "${P}" used in "having" needs to be provided in "by".`
            : [
                Error,
                'Field ',
                P,
                ` in "having" needs to be provided in "by"`,
              ]
        }[HavingFields]
      : 'take' extends Keys<T>
      ? 'orderBy' extends Keys<T>
        ? ByValid extends True
          ? {}
          : {
              [P in OrderFields]: P extends ByFields
                ? never
                : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
            }[OrderFields]
        : 'Error: If you provide "take", you also need to provide "orderBy"'
      : 'skip' extends Keys<T>
      ? 'orderBy' extends Keys<T>
        ? ByValid extends True
          ? {}
          : {
              [P in OrderFields]: P extends ByFields
                ? never
                : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
            }[OrderFields]
        : 'Error: If you provide "skip", you also need to provide "orderBy"'
      : ByValid extends True
      ? {}
      : {
          [P in OrderFields]: P extends ByFields
            ? never
            : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
        }[OrderFields]
    >(args: SubsetIntersection<T, VerificationGroupByArgs, OrderByArg> & InputErrors): {} extends InputErrors ? GetVerificationGroupByPayload<T> : Prisma.PrismaPromise<InputErrors>
  /**
   * Fields of the Verification model
   */
  readonly fields: VerificationFieldRefs;
  }

  /**
   * The delegate class that acts as a "Promise-like" for Verification.
   * Why is this prefixed with `Prisma__`?
   * Because we want to prevent naming conflicts as mentioned in
   * https://github.com/prisma/prisma-client-js/issues/707
   */
  export interface Prisma__VerificationClient<T, Null = never, ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs, GlobalOmitOptions = {}> extends Prisma.PrismaPromise<T> {
    readonly [Symbol.toStringTag]: "PrismaPromise"
    /**
     * Attaches callbacks for the resolution and/or rejection of the Promise.
     * @param onfulfilled The callback to execute when the Promise is resolved.
     * @param onrejected The callback to execute when the Promise is rejected.
     * @returns A Promise for the completion of which ever callback is executed.
     */
    then<TResult1 = T, TResult2 = never>(onfulfilled?: ((value: T) => TResult1 | PromiseLike<TResult1>) | undefined | null, onrejected?: ((reason: any) => TResult2 | PromiseLike<TResult2>) | undefined | null): $Utils.JsPromise<TResult1 | TResult2>
    /**
     * Attaches a callback for only the rejection of the Promise.
     * @param onrejected The callback to execute when the Promise is rejected.
     * @returns A Promise for the completion of the callback.
     */
    catch<TResult = never>(onrejected?: ((reason: any) => TResult | PromiseLike<TResult>) | undefined | null): $Utils.JsPromise<T | TResult>
    /**
     * Attaches a callback that is invoked when the Promise is settled (fulfilled or rejected). The
     * resolved value cannot be modified from the callback.
     * @param onfinally The callback to execute when the Promise is settled (fulfilled or rejected).
     * @returns A Promise for the completion of the callback.
     */
    finally(onfinally?: (() => void) | undefined | null): $Utils.JsPromise<T>
  }




  /**
   * Fields of the Verification model
   */
  interface VerificationFieldRefs {
    readonly id: FieldRef<"Verification", 'String'>
    readonly identifier: FieldRef<"Verification", 'String'>
    readonly value: FieldRef<"Verification", 'String'>
    readonly expiresAt: FieldRef<"Verification", 'DateTime'>
    readonly createdAt: FieldRef<"Verification", 'DateTime'>
    readonly updatedAt: FieldRef<"Verification", 'DateTime'>
  }
    

  // Custom InputTypes
  /**
   * Verification findUnique
   */
  export type VerificationFindUniqueArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Verification
     */
    select?: VerificationSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Verification
     */
    omit?: VerificationOmit<ExtArgs> | null
    /**
     * Filter, which Verification to fetch.
     */
    where: VerificationWhereUniqueInput
  }

  /**
   * Verification findUniqueOrThrow
   */
  export type VerificationFindUniqueOrThrowArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Verification
     */
    select?: VerificationSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Verification
     */
    omit?: VerificationOmit<ExtArgs> | null
    /**
     * Filter, which Verification to fetch.
     */
    where: VerificationWhereUniqueInput
  }

  /**
   * Verification findFirst
   */
  export type VerificationFindFirstArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Verification
     */
    select?: VerificationSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Verification
     */
    omit?: VerificationOmit<ExtArgs> | null
    /**
     * Filter, which Verification to fetch.
     */
    where?: VerificationWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of Verifications to fetch.
     */
    orderBy?: VerificationOrderByWithRelationInput | VerificationOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for searching for Verifications.
     */
    cursor?: VerificationWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` Verifications from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` Verifications.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/distinct Distinct Docs}
     * 
     * Filter by unique combinations of Verifications.
     */
    distinct?: VerificationScalarFieldEnum | VerificationScalarFieldEnum[]
  }

  /**
   * Verification findFirstOrThrow
   */
  export type VerificationFindFirstOrThrowArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Verification
     */
    select?: VerificationSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Verification
     */
    omit?: VerificationOmit<ExtArgs> | null
    /**
     * Filter, which Verification to fetch.
     */
    where?: VerificationWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of Verifications to fetch.
     */
    orderBy?: VerificationOrderByWithRelationInput | VerificationOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for searching for Verifications.
     */
    cursor?: VerificationWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` Verifications from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` Verifications.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/distinct Distinct Docs}
     * 
     * Filter by unique combinations of Verifications.
     */
    distinct?: VerificationScalarFieldEnum | VerificationScalarFieldEnum[]
  }

  /**
   * Verification findMany
   */
  export type VerificationFindManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Verification
     */
    select?: VerificationSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Verification
     */
    omit?: VerificationOmit<ExtArgs> | null
    /**
     * Filter, which Verifications to fetch.
     */
    where?: VerificationWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of Verifications to fetch.
     */
    orderBy?: VerificationOrderByWithRelationInput | VerificationOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for listing Verifications.
     */
    cursor?: VerificationWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` Verifications from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` Verifications.
     */
    skip?: number
    distinct?: VerificationScalarFieldEnum | VerificationScalarFieldEnum[]
  }

  /**
   * Verification create
   */
  export type VerificationCreateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Verification
     */
    select?: VerificationSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Verification
     */
    omit?: VerificationOmit<ExtArgs> | null
    /**
     * The data needed to create a Verification.
     */
    data: XOR<VerificationCreateInput, VerificationUncheckedCreateInput>
  }

  /**
   * Verification createMany
   */
  export type VerificationCreateManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * The data used to create many Verifications.
     */
    data: VerificationCreateManyInput | VerificationCreateManyInput[]
    skipDuplicates?: boolean
  }

  /**
   * Verification createManyAndReturn
   */
  export type VerificationCreateManyAndReturnArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Verification
     */
    select?: VerificationSelectCreateManyAndReturn<ExtArgs> | null
    /**
     * Omit specific fields from the Verification
     */
    omit?: VerificationOmit<ExtArgs> | null
    /**
     * The data used to create many Verifications.
     */
    data: VerificationCreateManyInput | VerificationCreateManyInput[]
    skipDuplicates?: boolean
  }

  /**
   * Verification update
   */
  export type VerificationUpdateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Verification
     */
    select?: VerificationSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Verification
     */
    omit?: VerificationOmit<ExtArgs> | null
    /**
     * The data needed to update a Verification.
     */
    data: XOR<VerificationUpdateInput, VerificationUncheckedUpdateInput>
    /**
     * Choose, which Verification to update.
     */
    where: VerificationWhereUniqueInput
  }

  /**
   * Verification updateMany
   */
  export type VerificationUpdateManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * The data used to update Verifications.
     */
    data: XOR<VerificationUpdateManyMutationInput, VerificationUncheckedUpdateManyInput>
    /**
     * Filter which Verifications to update
     */
    where?: VerificationWhereInput
    /**
     * Limit how many Verifications to update.
     */
    limit?: number
  }

  /**
   * Verification updateManyAndReturn
   */
  export type VerificationUpdateManyAndReturnArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Verification
     */
    select?: VerificationSelectUpdateManyAndReturn<ExtArgs> | null
    /**
     * Omit specific fields from the Verification
     */
    omit?: VerificationOmit<ExtArgs> | null
    /**
     * The data used to update Verifications.
     */
    data: XOR<VerificationUpdateManyMutationInput, VerificationUncheckedUpdateManyInput>
    /**
     * Filter which Verifications to update
     */
    where?: VerificationWhereInput
    /**
     * Limit how many Verifications to update.
     */
    limit?: number
  }

  /**
   * Verification upsert
   */
  export type VerificationUpsertArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Verification
     */
    select?: VerificationSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Verification
     */
    omit?: VerificationOmit<ExtArgs> | null
    /**
     * The filter to search for the Verification to update in case it exists.
     */
    where: VerificationWhereUniqueInput
    /**
     * In case the Verification found by the `where` argument doesn't exist, create a new Verification with this data.
     */
    create: XOR<VerificationCreateInput, VerificationUncheckedCreateInput>
    /**
     * In case the Verification was found with the provided `where` argument, update it with this data.
     */
    update: XOR<VerificationUpdateInput, VerificationUncheckedUpdateInput>
  }

  /**
   * Verification delete
   */
  export type VerificationDeleteArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Verification
     */
    select?: VerificationSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Verification
     */
    omit?: VerificationOmit<ExtArgs> | null
    /**
     * Filter which Verification to delete.
     */
    where: VerificationWhereUniqueInput
  }

  /**
   * Verification deleteMany
   */
  export type VerificationDeleteManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Filter which Verifications to delete
     */
    where?: VerificationWhereInput
    /**
     * Limit how many Verifications to delete.
     */
    limit?: number
  }

  /**
   * Verification without action
   */
  export type VerificationDefaultArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Verification
     */
    select?: VerificationSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Verification
     */
    omit?: VerificationOmit<ExtArgs> | null
  }


  /**
   * Model Crisis
   */

  export type AggregateCrisis = {
    _count: CrisisCountAggregateOutputType | null
    _avg: CrisisAvgAggregateOutputType | null
    _sum: CrisisSumAggregateOutputType | null
    _min: CrisisMinAggregateOutputType | null
    _max: CrisisMaxAggregateOutputType | null
  }

  export type CrisisAvgAggregateOutputType = {
    latitude: number | null
    longitude: number | null
    affectedPopulation: number | null
  }

  export type CrisisSumAggregateOutputType = {
    latitude: number | null
    longitude: number | null
    affectedPopulation: number | null
  }

  export type CrisisMinAggregateOutputType = {
    id: string | null
    title: string | null
    type: $Enums.CrisisType | null
    severity: $Enums.CrisisSeverity | null
    location: string | null
    latitude: number | null
    longitude: number | null
    description: string | null
    affectedPopulation: number | null
    status: $Enums.CrisisStatus | null
    createdById: string | null
    createdAt: Date | null
    updatedAt: Date | null
  }

  export type CrisisMaxAggregateOutputType = {
    id: string | null
    title: string | null
    type: $Enums.CrisisType | null
    severity: $Enums.CrisisSeverity | null
    location: string | null
    latitude: number | null
    longitude: number | null
    description: string | null
    affectedPopulation: number | null
    status: $Enums.CrisisStatus | null
    createdById: string | null
    createdAt: Date | null
    updatedAt: Date | null
  }

  export type CrisisCountAggregateOutputType = {
    id: number
    title: number
    type: number
    severity: number
    location: number
    latitude: number
    longitude: number
    description: number
    affectedPopulation: number
    status: number
    createdById: number
    createdAt: number
    updatedAt: number
    _all: number
  }


  export type CrisisAvgAggregateInputType = {
    latitude?: true
    longitude?: true
    affectedPopulation?: true
  }

  export type CrisisSumAggregateInputType = {
    latitude?: true
    longitude?: true
    affectedPopulation?: true
  }

  export type CrisisMinAggregateInputType = {
    id?: true
    title?: true
    type?: true
    severity?: true
    location?: true
    latitude?: true
    longitude?: true
    description?: true
    affectedPopulation?: true
    status?: true
    createdById?: true
    createdAt?: true
    updatedAt?: true
  }

  export type CrisisMaxAggregateInputType = {
    id?: true
    title?: true
    type?: true
    severity?: true
    location?: true
    latitude?: true
    longitude?: true
    description?: true
    affectedPopulation?: true
    status?: true
    createdById?: true
    createdAt?: true
    updatedAt?: true
  }

  export type CrisisCountAggregateInputType = {
    id?: true
    title?: true
    type?: true
    severity?: true
    location?: true
    latitude?: true
    longitude?: true
    description?: true
    affectedPopulation?: true
    status?: true
    createdById?: true
    createdAt?: true
    updatedAt?: true
    _all?: true
  }

  export type CrisisAggregateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Filter which Crisis to aggregate.
     */
    where?: CrisisWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of Crises to fetch.
     */
    orderBy?: CrisisOrderByWithRelationInput | CrisisOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the start position
     */
    cursor?: CrisisWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` Crises from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` Crises.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Count returned Crises
    **/
    _count?: true | CrisisCountAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to average
    **/
    _avg?: CrisisAvgAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to sum
    **/
    _sum?: CrisisSumAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to find the minimum value
    **/
    _min?: CrisisMinAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to find the maximum value
    **/
    _max?: CrisisMaxAggregateInputType
  }

  export type GetCrisisAggregateType<T extends CrisisAggregateArgs> = {
        [P in keyof T & keyof AggregateCrisis]: P extends '_count' | 'count'
      ? T[P] extends true
        ? number
        : GetScalarType<T[P], AggregateCrisis[P]>
      : GetScalarType<T[P], AggregateCrisis[P]>
  }




  export type CrisisGroupByArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    where?: CrisisWhereInput
    orderBy?: CrisisOrderByWithAggregationInput | CrisisOrderByWithAggregationInput[]
    by: CrisisScalarFieldEnum[] | CrisisScalarFieldEnum
    having?: CrisisScalarWhereWithAggregatesInput
    take?: number
    skip?: number
    _count?: CrisisCountAggregateInputType | true
    _avg?: CrisisAvgAggregateInputType
    _sum?: CrisisSumAggregateInputType
    _min?: CrisisMinAggregateInputType
    _max?: CrisisMaxAggregateInputType
  }

  export type CrisisGroupByOutputType = {
    id: string
    title: string
    type: $Enums.CrisisType
    severity: $Enums.CrisisSeverity
    location: string
    latitude: number | null
    longitude: number | null
    description: string | null
    affectedPopulation: number
    status: $Enums.CrisisStatus
    createdById: string
    createdAt: Date
    updatedAt: Date
    _count: CrisisCountAggregateOutputType | null
    _avg: CrisisAvgAggregateOutputType | null
    _sum: CrisisSumAggregateOutputType | null
    _min: CrisisMinAggregateOutputType | null
    _max: CrisisMaxAggregateOutputType | null
  }

  type GetCrisisGroupByPayload<T extends CrisisGroupByArgs> = Prisma.PrismaPromise<
    Array<
      PickEnumerable<CrisisGroupByOutputType, T['by']> &
        {
          [P in ((keyof T) & (keyof CrisisGroupByOutputType))]: P extends '_count'
            ? T[P] extends boolean
              ? number
              : GetScalarType<T[P], CrisisGroupByOutputType[P]>
            : GetScalarType<T[P], CrisisGroupByOutputType[P]>
        }
      >
    >


  export type CrisisSelect<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetSelect<{
    id?: boolean
    title?: boolean
    type?: boolean
    severity?: boolean
    location?: boolean
    latitude?: boolean
    longitude?: boolean
    description?: boolean
    affectedPopulation?: boolean
    status?: boolean
    createdById?: boolean
    createdAt?: boolean
    updatedAt?: boolean
    createdBy?: boolean | UserDefaultArgs<ExtArgs>
    decisions?: boolean | Crisis$decisionsArgs<ExtArgs>
    alerts?: boolean | Crisis$alertsArgs<ExtArgs>
    _count?: boolean | CrisisCountOutputTypeDefaultArgs<ExtArgs>
  }, ExtArgs["result"]["crisis"]>

  export type CrisisSelectCreateManyAndReturn<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetSelect<{
    id?: boolean
    title?: boolean
    type?: boolean
    severity?: boolean
    location?: boolean
    latitude?: boolean
    longitude?: boolean
    description?: boolean
    affectedPopulation?: boolean
    status?: boolean
    createdById?: boolean
    createdAt?: boolean
    updatedAt?: boolean
    createdBy?: boolean | UserDefaultArgs<ExtArgs>
  }, ExtArgs["result"]["crisis"]>

  export type CrisisSelectUpdateManyAndReturn<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetSelect<{
    id?: boolean
    title?: boolean
    type?: boolean
    severity?: boolean
    location?: boolean
    latitude?: boolean
    longitude?: boolean
    description?: boolean
    affectedPopulation?: boolean
    status?: boolean
    createdById?: boolean
    createdAt?: boolean
    updatedAt?: boolean
    createdBy?: boolean | UserDefaultArgs<ExtArgs>
  }, ExtArgs["result"]["crisis"]>

  export type CrisisSelectScalar = {
    id?: boolean
    title?: boolean
    type?: boolean
    severity?: boolean
    location?: boolean
    latitude?: boolean
    longitude?: boolean
    description?: boolean
    affectedPopulation?: boolean
    status?: boolean
    createdById?: boolean
    createdAt?: boolean
    updatedAt?: boolean
  }

  export type CrisisOmit<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetOmit<"id" | "title" | "type" | "severity" | "location" | "latitude" | "longitude" | "description" | "affectedPopulation" | "status" | "createdById" | "createdAt" | "updatedAt", ExtArgs["result"]["crisis"]>
  export type CrisisInclude<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    createdBy?: boolean | UserDefaultArgs<ExtArgs>
    decisions?: boolean | Crisis$decisionsArgs<ExtArgs>
    alerts?: boolean | Crisis$alertsArgs<ExtArgs>
    _count?: boolean | CrisisCountOutputTypeDefaultArgs<ExtArgs>
  }
  export type CrisisIncludeCreateManyAndReturn<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    createdBy?: boolean | UserDefaultArgs<ExtArgs>
  }
  export type CrisisIncludeUpdateManyAndReturn<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    createdBy?: boolean | UserDefaultArgs<ExtArgs>
  }

  export type $CrisisPayload<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    name: "Crisis"
    objects: {
      createdBy: Prisma.$UserPayload<ExtArgs>
      decisions: Prisma.$DecisionPayload<ExtArgs>[]
      alerts: Prisma.$AlertPayload<ExtArgs>[]
    }
    scalars: $Extensions.GetPayloadResult<{
      id: string
      title: string
      type: $Enums.CrisisType
      severity: $Enums.CrisisSeverity
      location: string
      latitude: number | null
      longitude: number | null
      description: string | null
      affectedPopulation: number
      status: $Enums.CrisisStatus
      createdById: string
      createdAt: Date
      updatedAt: Date
    }, ExtArgs["result"]["crisis"]>
    composites: {}
  }

  type CrisisGetPayload<S extends boolean | null | undefined | CrisisDefaultArgs> = $Result.GetResult<Prisma.$CrisisPayload, S>

  type CrisisCountArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> =
    Omit<CrisisFindManyArgs, 'select' | 'include' | 'distinct' | 'omit'> & {
      select?: CrisisCountAggregateInputType | true
    }

  export interface CrisisDelegate<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs, GlobalOmitOptions = {}> {
    [K: symbol]: { types: Prisma.TypeMap<ExtArgs>['model']['Crisis'], meta: { name: 'Crisis' } }
    /**
     * Find zero or one Crisis that matches the filter.
     * @param {CrisisFindUniqueArgs} args - Arguments to find a Crisis
     * @example
     * // Get one Crisis
     * const crisis = await prisma.crisis.findUnique({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findUnique<T extends CrisisFindUniqueArgs>(args: SelectSubset<T, CrisisFindUniqueArgs<ExtArgs>>): Prisma__CrisisClient<$Result.GetResult<Prisma.$CrisisPayload<ExtArgs>, T, "findUnique", GlobalOmitOptions> | null, null, ExtArgs, GlobalOmitOptions>

    /**
     * Find one Crisis that matches the filter or throw an error with `error.code='P2025'`
     * if no matches were found.
     * @param {CrisisFindUniqueOrThrowArgs} args - Arguments to find a Crisis
     * @example
     * // Get one Crisis
     * const crisis = await prisma.crisis.findUniqueOrThrow({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findUniqueOrThrow<T extends CrisisFindUniqueOrThrowArgs>(args: SelectSubset<T, CrisisFindUniqueOrThrowArgs<ExtArgs>>): Prisma__CrisisClient<$Result.GetResult<Prisma.$CrisisPayload<ExtArgs>, T, "findUniqueOrThrow", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Find the first Crisis that matches the filter.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {CrisisFindFirstArgs} args - Arguments to find a Crisis
     * @example
     * // Get one Crisis
     * const crisis = await prisma.crisis.findFirst({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findFirst<T extends CrisisFindFirstArgs>(args?: SelectSubset<T, CrisisFindFirstArgs<ExtArgs>>): Prisma__CrisisClient<$Result.GetResult<Prisma.$CrisisPayload<ExtArgs>, T, "findFirst", GlobalOmitOptions> | null, null, ExtArgs, GlobalOmitOptions>

    /**
     * Find the first Crisis that matches the filter or
     * throw `PrismaKnownClientError` with `P2025` code if no matches were found.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {CrisisFindFirstOrThrowArgs} args - Arguments to find a Crisis
     * @example
     * // Get one Crisis
     * const crisis = await prisma.crisis.findFirstOrThrow({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findFirstOrThrow<T extends CrisisFindFirstOrThrowArgs>(args?: SelectSubset<T, CrisisFindFirstOrThrowArgs<ExtArgs>>): Prisma__CrisisClient<$Result.GetResult<Prisma.$CrisisPayload<ExtArgs>, T, "findFirstOrThrow", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Find zero or more Crises that matches the filter.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {CrisisFindManyArgs} args - Arguments to filter and select certain fields only.
     * @example
     * // Get all Crises
     * const crises = await prisma.crisis.findMany()
     * 
     * // Get first 10 Crises
     * const crises = await prisma.crisis.findMany({ take: 10 })
     * 
     * // Only select the `id`
     * const crisisWithIdOnly = await prisma.crisis.findMany({ select: { id: true } })
     * 
     */
    findMany<T extends CrisisFindManyArgs>(args?: SelectSubset<T, CrisisFindManyArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$CrisisPayload<ExtArgs>, T, "findMany", GlobalOmitOptions>>

    /**
     * Create a Crisis.
     * @param {CrisisCreateArgs} args - Arguments to create a Crisis.
     * @example
     * // Create one Crisis
     * const Crisis = await prisma.crisis.create({
     *   data: {
     *     // ... data to create a Crisis
     *   }
     * })
     * 
     */
    create<T extends CrisisCreateArgs>(args: SelectSubset<T, CrisisCreateArgs<ExtArgs>>): Prisma__CrisisClient<$Result.GetResult<Prisma.$CrisisPayload<ExtArgs>, T, "create", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Create many Crises.
     * @param {CrisisCreateManyArgs} args - Arguments to create many Crises.
     * @example
     * // Create many Crises
     * const crisis = await prisma.crisis.createMany({
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     *     
     */
    createMany<T extends CrisisCreateManyArgs>(args?: SelectSubset<T, CrisisCreateManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Create many Crises and returns the data saved in the database.
     * @param {CrisisCreateManyAndReturnArgs} args - Arguments to create many Crises.
     * @example
     * // Create many Crises
     * const crisis = await prisma.crisis.createManyAndReturn({
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * 
     * // Create many Crises and only return the `id`
     * const crisisWithIdOnly = await prisma.crisis.createManyAndReturn({
     *   select: { id: true },
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * 
     */
    createManyAndReturn<T extends CrisisCreateManyAndReturnArgs>(args?: SelectSubset<T, CrisisCreateManyAndReturnArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$CrisisPayload<ExtArgs>, T, "createManyAndReturn", GlobalOmitOptions>>

    /**
     * Delete a Crisis.
     * @param {CrisisDeleteArgs} args - Arguments to delete one Crisis.
     * @example
     * // Delete one Crisis
     * const Crisis = await prisma.crisis.delete({
     *   where: {
     *     // ... filter to delete one Crisis
     *   }
     * })
     * 
     */
    delete<T extends CrisisDeleteArgs>(args: SelectSubset<T, CrisisDeleteArgs<ExtArgs>>): Prisma__CrisisClient<$Result.GetResult<Prisma.$CrisisPayload<ExtArgs>, T, "delete", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Update one Crisis.
     * @param {CrisisUpdateArgs} args - Arguments to update one Crisis.
     * @example
     * // Update one Crisis
     * const crisis = await prisma.crisis.update({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: {
     *     // ... provide data here
     *   }
     * })
     * 
     */
    update<T extends CrisisUpdateArgs>(args: SelectSubset<T, CrisisUpdateArgs<ExtArgs>>): Prisma__CrisisClient<$Result.GetResult<Prisma.$CrisisPayload<ExtArgs>, T, "update", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Delete zero or more Crises.
     * @param {CrisisDeleteManyArgs} args - Arguments to filter Crises to delete.
     * @example
     * // Delete a few Crises
     * const { count } = await prisma.crisis.deleteMany({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     * 
     */
    deleteMany<T extends CrisisDeleteManyArgs>(args?: SelectSubset<T, CrisisDeleteManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Update zero or more Crises.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {CrisisUpdateManyArgs} args - Arguments to update one or more rows.
     * @example
     * // Update many Crises
     * const crisis = await prisma.crisis.updateMany({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: {
     *     // ... provide data here
     *   }
     * })
     * 
     */
    updateMany<T extends CrisisUpdateManyArgs>(args: SelectSubset<T, CrisisUpdateManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Update zero or more Crises and returns the data updated in the database.
     * @param {CrisisUpdateManyAndReturnArgs} args - Arguments to update many Crises.
     * @example
     * // Update many Crises
     * const crisis = await prisma.crisis.updateManyAndReturn({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * 
     * // Update zero or more Crises and only return the `id`
     * const crisisWithIdOnly = await prisma.crisis.updateManyAndReturn({
     *   select: { id: true },
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * 
     */
    updateManyAndReturn<T extends CrisisUpdateManyAndReturnArgs>(args: SelectSubset<T, CrisisUpdateManyAndReturnArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$CrisisPayload<ExtArgs>, T, "updateManyAndReturn", GlobalOmitOptions>>

    /**
     * Create or update one Crisis.
     * @param {CrisisUpsertArgs} args - Arguments to update or create a Crisis.
     * @example
     * // Update or create a Crisis
     * const crisis = await prisma.crisis.upsert({
     *   create: {
     *     // ... data to create a Crisis
     *   },
     *   update: {
     *     // ... in case it already exists, update
     *   },
     *   where: {
     *     // ... the filter for the Crisis we want to update
     *   }
     * })
     */
    upsert<T extends CrisisUpsertArgs>(args: SelectSubset<T, CrisisUpsertArgs<ExtArgs>>): Prisma__CrisisClient<$Result.GetResult<Prisma.$CrisisPayload<ExtArgs>, T, "upsert", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>


    /**
     * Count the number of Crises.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {CrisisCountArgs} args - Arguments to filter Crises to count.
     * @example
     * // Count the number of Crises
     * const count = await prisma.crisis.count({
     *   where: {
     *     // ... the filter for the Crises we want to count
     *   }
     * })
    **/
    count<T extends CrisisCountArgs>(
      args?: Subset<T, CrisisCountArgs>,
    ): Prisma.PrismaPromise<
      T extends $Utils.Record<'select', any>
        ? T['select'] extends true
          ? number
          : GetScalarType<T['select'], CrisisCountAggregateOutputType>
        : number
    >

    /**
     * Allows you to perform aggregations operations on a Crisis.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {CrisisAggregateArgs} args - Select which aggregations you would like to apply and on what fields.
     * @example
     * // Ordered by age ascending
     * // Where email contains prisma.io
     * // Limited to the 10 users
     * const aggregations = await prisma.user.aggregate({
     *   _avg: {
     *     age: true,
     *   },
     *   where: {
     *     email: {
     *       contains: "prisma.io",
     *     },
     *   },
     *   orderBy: {
     *     age: "asc",
     *   },
     *   take: 10,
     * })
    **/
    aggregate<T extends CrisisAggregateArgs>(args: Subset<T, CrisisAggregateArgs>): Prisma.PrismaPromise<GetCrisisAggregateType<T>>

    /**
     * Group by Crisis.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {CrisisGroupByArgs} args - Group by arguments.
     * @example
     * // Group by city, order by createdAt, get count
     * const result = await prisma.user.groupBy({
     *   by: ['city', 'createdAt'],
     *   orderBy: {
     *     createdAt: true
     *   },
     *   _count: {
     *     _all: true
     *   },
     * })
     * 
    **/
    groupBy<
      T extends CrisisGroupByArgs,
      HasSelectOrTake extends Or<
        Extends<'skip', Keys<T>>,
        Extends<'take', Keys<T>>
      >,
      OrderByArg extends True extends HasSelectOrTake
        ? { orderBy: CrisisGroupByArgs['orderBy'] }
        : { orderBy?: CrisisGroupByArgs['orderBy'] },
      OrderFields extends ExcludeUnderscoreKeys<Keys<MaybeTupleToUnion<T['orderBy']>>>,
      ByFields extends MaybeTupleToUnion<T['by']>,
      ByValid extends Has<ByFields, OrderFields>,
      HavingFields extends GetHavingFields<T['having']>,
      HavingValid extends Has<ByFields, HavingFields>,
      ByEmpty extends T['by'] extends never[] ? True : False,
      InputErrors extends ByEmpty extends True
      ? `Error: "by" must not be empty.`
      : HavingValid extends False
      ? {
          [P in HavingFields]: P extends ByFields
            ? never
            : P extends string
            ? `Error: Field "${P}" used in "having" needs to be provided in "by".`
            : [
                Error,
                'Field ',
                P,
                ` in "having" needs to be provided in "by"`,
              ]
        }[HavingFields]
      : 'take' extends Keys<T>
      ? 'orderBy' extends Keys<T>
        ? ByValid extends True
          ? {}
          : {
              [P in OrderFields]: P extends ByFields
                ? never
                : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
            }[OrderFields]
        : 'Error: If you provide "take", you also need to provide "orderBy"'
      : 'skip' extends Keys<T>
      ? 'orderBy' extends Keys<T>
        ? ByValid extends True
          ? {}
          : {
              [P in OrderFields]: P extends ByFields
                ? never
                : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
            }[OrderFields]
        : 'Error: If you provide "skip", you also need to provide "orderBy"'
      : ByValid extends True
      ? {}
      : {
          [P in OrderFields]: P extends ByFields
            ? never
            : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
        }[OrderFields]
    >(args: SubsetIntersection<T, CrisisGroupByArgs, OrderByArg> & InputErrors): {} extends InputErrors ? GetCrisisGroupByPayload<T> : Prisma.PrismaPromise<InputErrors>
  /**
   * Fields of the Crisis model
   */
  readonly fields: CrisisFieldRefs;
  }

  /**
   * The delegate class that acts as a "Promise-like" for Crisis.
   * Why is this prefixed with `Prisma__`?
   * Because we want to prevent naming conflicts as mentioned in
   * https://github.com/prisma/prisma-client-js/issues/707
   */
  export interface Prisma__CrisisClient<T, Null = never, ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs, GlobalOmitOptions = {}> extends Prisma.PrismaPromise<T> {
    readonly [Symbol.toStringTag]: "PrismaPromise"
    createdBy<T extends UserDefaultArgs<ExtArgs> = {}>(args?: Subset<T, UserDefaultArgs<ExtArgs>>): Prisma__UserClient<$Result.GetResult<Prisma.$UserPayload<ExtArgs>, T, "findUniqueOrThrow", GlobalOmitOptions> | Null, Null, ExtArgs, GlobalOmitOptions>
    decisions<T extends Crisis$decisionsArgs<ExtArgs> = {}>(args?: Subset<T, Crisis$decisionsArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$DecisionPayload<ExtArgs>, T, "findMany", GlobalOmitOptions> | Null>
    alerts<T extends Crisis$alertsArgs<ExtArgs> = {}>(args?: Subset<T, Crisis$alertsArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$AlertPayload<ExtArgs>, T, "findMany", GlobalOmitOptions> | Null>
    /**
     * Attaches callbacks for the resolution and/or rejection of the Promise.
     * @param onfulfilled The callback to execute when the Promise is resolved.
     * @param onrejected The callback to execute when the Promise is rejected.
     * @returns A Promise for the completion of which ever callback is executed.
     */
    then<TResult1 = T, TResult2 = never>(onfulfilled?: ((value: T) => TResult1 | PromiseLike<TResult1>) | undefined | null, onrejected?: ((reason: any) => TResult2 | PromiseLike<TResult2>) | undefined | null): $Utils.JsPromise<TResult1 | TResult2>
    /**
     * Attaches a callback for only the rejection of the Promise.
     * @param onrejected The callback to execute when the Promise is rejected.
     * @returns A Promise for the completion of the callback.
     */
    catch<TResult = never>(onrejected?: ((reason: any) => TResult | PromiseLike<TResult>) | undefined | null): $Utils.JsPromise<T | TResult>
    /**
     * Attaches a callback that is invoked when the Promise is settled (fulfilled or rejected). The
     * resolved value cannot be modified from the callback.
     * @param onfinally The callback to execute when the Promise is settled (fulfilled or rejected).
     * @returns A Promise for the completion of the callback.
     */
    finally(onfinally?: (() => void) | undefined | null): $Utils.JsPromise<T>
  }




  /**
   * Fields of the Crisis model
   */
  interface CrisisFieldRefs {
    readonly id: FieldRef<"Crisis", 'String'>
    readonly title: FieldRef<"Crisis", 'String'>
    readonly type: FieldRef<"Crisis", 'CrisisType'>
    readonly severity: FieldRef<"Crisis", 'CrisisSeverity'>
    readonly location: FieldRef<"Crisis", 'String'>
    readonly latitude: FieldRef<"Crisis", 'Float'>
    readonly longitude: FieldRef<"Crisis", 'Float'>
    readonly description: FieldRef<"Crisis", 'String'>
    readonly affectedPopulation: FieldRef<"Crisis", 'Int'>
    readonly status: FieldRef<"Crisis", 'CrisisStatus'>
    readonly createdById: FieldRef<"Crisis", 'String'>
    readonly createdAt: FieldRef<"Crisis", 'DateTime'>
    readonly updatedAt: FieldRef<"Crisis", 'DateTime'>
  }
    

  // Custom InputTypes
  /**
   * Crisis findUnique
   */
  export type CrisisFindUniqueArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Crisis
     */
    select?: CrisisSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Crisis
     */
    omit?: CrisisOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: CrisisInclude<ExtArgs> | null
    /**
     * Filter, which Crisis to fetch.
     */
    where: CrisisWhereUniqueInput
  }

  /**
   * Crisis findUniqueOrThrow
   */
  export type CrisisFindUniqueOrThrowArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Crisis
     */
    select?: CrisisSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Crisis
     */
    omit?: CrisisOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: CrisisInclude<ExtArgs> | null
    /**
     * Filter, which Crisis to fetch.
     */
    where: CrisisWhereUniqueInput
  }

  /**
   * Crisis findFirst
   */
  export type CrisisFindFirstArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Crisis
     */
    select?: CrisisSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Crisis
     */
    omit?: CrisisOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: CrisisInclude<ExtArgs> | null
    /**
     * Filter, which Crisis to fetch.
     */
    where?: CrisisWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of Crises to fetch.
     */
    orderBy?: CrisisOrderByWithRelationInput | CrisisOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for searching for Crises.
     */
    cursor?: CrisisWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` Crises from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` Crises.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/distinct Distinct Docs}
     * 
     * Filter by unique combinations of Crises.
     */
    distinct?: CrisisScalarFieldEnum | CrisisScalarFieldEnum[]
  }

  /**
   * Crisis findFirstOrThrow
   */
  export type CrisisFindFirstOrThrowArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Crisis
     */
    select?: CrisisSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Crisis
     */
    omit?: CrisisOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: CrisisInclude<ExtArgs> | null
    /**
     * Filter, which Crisis to fetch.
     */
    where?: CrisisWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of Crises to fetch.
     */
    orderBy?: CrisisOrderByWithRelationInput | CrisisOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for searching for Crises.
     */
    cursor?: CrisisWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` Crises from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` Crises.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/distinct Distinct Docs}
     * 
     * Filter by unique combinations of Crises.
     */
    distinct?: CrisisScalarFieldEnum | CrisisScalarFieldEnum[]
  }

  /**
   * Crisis findMany
   */
  export type CrisisFindManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Crisis
     */
    select?: CrisisSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Crisis
     */
    omit?: CrisisOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: CrisisInclude<ExtArgs> | null
    /**
     * Filter, which Crises to fetch.
     */
    where?: CrisisWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of Crises to fetch.
     */
    orderBy?: CrisisOrderByWithRelationInput | CrisisOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for listing Crises.
     */
    cursor?: CrisisWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` Crises from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` Crises.
     */
    skip?: number
    distinct?: CrisisScalarFieldEnum | CrisisScalarFieldEnum[]
  }

  /**
   * Crisis create
   */
  export type CrisisCreateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Crisis
     */
    select?: CrisisSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Crisis
     */
    omit?: CrisisOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: CrisisInclude<ExtArgs> | null
    /**
     * The data needed to create a Crisis.
     */
    data: XOR<CrisisCreateInput, CrisisUncheckedCreateInput>
  }

  /**
   * Crisis createMany
   */
  export type CrisisCreateManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * The data used to create many Crises.
     */
    data: CrisisCreateManyInput | CrisisCreateManyInput[]
    skipDuplicates?: boolean
  }

  /**
   * Crisis createManyAndReturn
   */
  export type CrisisCreateManyAndReturnArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Crisis
     */
    select?: CrisisSelectCreateManyAndReturn<ExtArgs> | null
    /**
     * Omit specific fields from the Crisis
     */
    omit?: CrisisOmit<ExtArgs> | null
    /**
     * The data used to create many Crises.
     */
    data: CrisisCreateManyInput | CrisisCreateManyInput[]
    skipDuplicates?: boolean
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: CrisisIncludeCreateManyAndReturn<ExtArgs> | null
  }

  /**
   * Crisis update
   */
  export type CrisisUpdateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Crisis
     */
    select?: CrisisSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Crisis
     */
    omit?: CrisisOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: CrisisInclude<ExtArgs> | null
    /**
     * The data needed to update a Crisis.
     */
    data: XOR<CrisisUpdateInput, CrisisUncheckedUpdateInput>
    /**
     * Choose, which Crisis to update.
     */
    where: CrisisWhereUniqueInput
  }

  /**
   * Crisis updateMany
   */
  export type CrisisUpdateManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * The data used to update Crises.
     */
    data: XOR<CrisisUpdateManyMutationInput, CrisisUncheckedUpdateManyInput>
    /**
     * Filter which Crises to update
     */
    where?: CrisisWhereInput
    /**
     * Limit how many Crises to update.
     */
    limit?: number
  }

  /**
   * Crisis updateManyAndReturn
   */
  export type CrisisUpdateManyAndReturnArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Crisis
     */
    select?: CrisisSelectUpdateManyAndReturn<ExtArgs> | null
    /**
     * Omit specific fields from the Crisis
     */
    omit?: CrisisOmit<ExtArgs> | null
    /**
     * The data used to update Crises.
     */
    data: XOR<CrisisUpdateManyMutationInput, CrisisUncheckedUpdateManyInput>
    /**
     * Filter which Crises to update
     */
    where?: CrisisWhereInput
    /**
     * Limit how many Crises to update.
     */
    limit?: number
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: CrisisIncludeUpdateManyAndReturn<ExtArgs> | null
  }

  /**
   * Crisis upsert
   */
  export type CrisisUpsertArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Crisis
     */
    select?: CrisisSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Crisis
     */
    omit?: CrisisOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: CrisisInclude<ExtArgs> | null
    /**
     * The filter to search for the Crisis to update in case it exists.
     */
    where: CrisisWhereUniqueInput
    /**
     * In case the Crisis found by the `where` argument doesn't exist, create a new Crisis with this data.
     */
    create: XOR<CrisisCreateInput, CrisisUncheckedCreateInput>
    /**
     * In case the Crisis was found with the provided `where` argument, update it with this data.
     */
    update: XOR<CrisisUpdateInput, CrisisUncheckedUpdateInput>
  }

  /**
   * Crisis delete
   */
  export type CrisisDeleteArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Crisis
     */
    select?: CrisisSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Crisis
     */
    omit?: CrisisOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: CrisisInclude<ExtArgs> | null
    /**
     * Filter which Crisis to delete.
     */
    where: CrisisWhereUniqueInput
  }

  /**
   * Crisis deleteMany
   */
  export type CrisisDeleteManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Filter which Crises to delete
     */
    where?: CrisisWhereInput
    /**
     * Limit how many Crises to delete.
     */
    limit?: number
  }

  /**
   * Crisis.decisions
   */
  export type Crisis$decisionsArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Decision
     */
    select?: DecisionSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Decision
     */
    omit?: DecisionOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: DecisionInclude<ExtArgs> | null
    where?: DecisionWhereInput
    orderBy?: DecisionOrderByWithRelationInput | DecisionOrderByWithRelationInput[]
    cursor?: DecisionWhereUniqueInput
    take?: number
    skip?: number
    distinct?: DecisionScalarFieldEnum | DecisionScalarFieldEnum[]
  }

  /**
   * Crisis.alerts
   */
  export type Crisis$alertsArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Alert
     */
    select?: AlertSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Alert
     */
    omit?: AlertOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: AlertInclude<ExtArgs> | null
    where?: AlertWhereInput
    orderBy?: AlertOrderByWithRelationInput | AlertOrderByWithRelationInput[]
    cursor?: AlertWhereUniqueInput
    take?: number
    skip?: number
    distinct?: AlertScalarFieldEnum | AlertScalarFieldEnum[]
  }

  /**
   * Crisis without action
   */
  export type CrisisDefaultArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Crisis
     */
    select?: CrisisSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Crisis
     */
    omit?: CrisisOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: CrisisInclude<ExtArgs> | null
  }


  /**
   * Model Decision
   */

  export type AggregateDecision = {
    _count: DecisionCountAggregateOutputType | null
    _avg: DecisionAvgAggregateOutputType | null
    _sum: DecisionSumAggregateOutputType | null
    _min: DecisionMinAggregateOutputType | null
    _max: DecisionMaxAggregateOutputType | null
  }

  export type DecisionAvgAggregateOutputType = {
    confidenceScore: number | null
  }

  export type DecisionSumAggregateOutputType = {
    confidenceScore: number | null
  }

  export type DecisionMinAggregateOutputType = {
    id: string | null
    crisisId: string | null
    title: string | null
    decisionText: string | null
    rationale: string | null
    confidenceScore: number | null
    optionA: string | null
    optionB: string | null
    optionC: string | null
    selectedOption: $Enums.SelectedOption | null
    outcome: string | null
    madeById: string | null
    createdAt: Date | null
    updatedAt: Date | null
  }

  export type DecisionMaxAggregateOutputType = {
    id: string | null
    crisisId: string | null
    title: string | null
    decisionText: string | null
    rationale: string | null
    confidenceScore: number | null
    optionA: string | null
    optionB: string | null
    optionC: string | null
    selectedOption: $Enums.SelectedOption | null
    outcome: string | null
    madeById: string | null
    createdAt: Date | null
    updatedAt: Date | null
  }

  export type DecisionCountAggregateOutputType = {
    id: number
    crisisId: number
    title: number
    decisionText: number
    rationale: number
    confidenceScore: number
    optionA: number
    optionB: number
    optionC: number
    selectedOption: number
    outcome: number
    madeById: number
    createdAt: number
    updatedAt: number
    _all: number
  }


  export type DecisionAvgAggregateInputType = {
    confidenceScore?: true
  }

  export type DecisionSumAggregateInputType = {
    confidenceScore?: true
  }

  export type DecisionMinAggregateInputType = {
    id?: true
    crisisId?: true
    title?: true
    decisionText?: true
    rationale?: true
    confidenceScore?: true
    optionA?: true
    optionB?: true
    optionC?: true
    selectedOption?: true
    outcome?: true
    madeById?: true
    createdAt?: true
    updatedAt?: true
  }

  export type DecisionMaxAggregateInputType = {
    id?: true
    crisisId?: true
    title?: true
    decisionText?: true
    rationale?: true
    confidenceScore?: true
    optionA?: true
    optionB?: true
    optionC?: true
    selectedOption?: true
    outcome?: true
    madeById?: true
    createdAt?: true
    updatedAt?: true
  }

  export type DecisionCountAggregateInputType = {
    id?: true
    crisisId?: true
    title?: true
    decisionText?: true
    rationale?: true
    confidenceScore?: true
    optionA?: true
    optionB?: true
    optionC?: true
    selectedOption?: true
    outcome?: true
    madeById?: true
    createdAt?: true
    updatedAt?: true
    _all?: true
  }

  export type DecisionAggregateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Filter which Decision to aggregate.
     */
    where?: DecisionWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of Decisions to fetch.
     */
    orderBy?: DecisionOrderByWithRelationInput | DecisionOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the start position
     */
    cursor?: DecisionWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` Decisions from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` Decisions.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Count returned Decisions
    **/
    _count?: true | DecisionCountAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to average
    **/
    _avg?: DecisionAvgAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to sum
    **/
    _sum?: DecisionSumAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to find the minimum value
    **/
    _min?: DecisionMinAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to find the maximum value
    **/
    _max?: DecisionMaxAggregateInputType
  }

  export type GetDecisionAggregateType<T extends DecisionAggregateArgs> = {
        [P in keyof T & keyof AggregateDecision]: P extends '_count' | 'count'
      ? T[P] extends true
        ? number
        : GetScalarType<T[P], AggregateDecision[P]>
      : GetScalarType<T[P], AggregateDecision[P]>
  }




  export type DecisionGroupByArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    where?: DecisionWhereInput
    orderBy?: DecisionOrderByWithAggregationInput | DecisionOrderByWithAggregationInput[]
    by: DecisionScalarFieldEnum[] | DecisionScalarFieldEnum
    having?: DecisionScalarWhereWithAggregatesInput
    take?: number
    skip?: number
    _count?: DecisionCountAggregateInputType | true
    _avg?: DecisionAvgAggregateInputType
    _sum?: DecisionSumAggregateInputType
    _min?: DecisionMinAggregateInputType
    _max?: DecisionMaxAggregateInputType
  }

  export type DecisionGroupByOutputType = {
    id: string
    crisisId: string
    title: string
    decisionText: string
    rationale: string | null
    confidenceScore: number
    optionA: string | null
    optionB: string | null
    optionC: string | null
    selectedOption: $Enums.SelectedOption
    outcome: string | null
    madeById: string
    createdAt: Date
    updatedAt: Date
    _count: DecisionCountAggregateOutputType | null
    _avg: DecisionAvgAggregateOutputType | null
    _sum: DecisionSumAggregateOutputType | null
    _min: DecisionMinAggregateOutputType | null
    _max: DecisionMaxAggregateOutputType | null
  }

  type GetDecisionGroupByPayload<T extends DecisionGroupByArgs> = Prisma.PrismaPromise<
    Array<
      PickEnumerable<DecisionGroupByOutputType, T['by']> &
        {
          [P in ((keyof T) & (keyof DecisionGroupByOutputType))]: P extends '_count'
            ? T[P] extends boolean
              ? number
              : GetScalarType<T[P], DecisionGroupByOutputType[P]>
            : GetScalarType<T[P], DecisionGroupByOutputType[P]>
        }
      >
    >


  export type DecisionSelect<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetSelect<{
    id?: boolean
    crisisId?: boolean
    title?: boolean
    decisionText?: boolean
    rationale?: boolean
    confidenceScore?: boolean
    optionA?: boolean
    optionB?: boolean
    optionC?: boolean
    selectedOption?: boolean
    outcome?: boolean
    madeById?: boolean
    createdAt?: boolean
    updatedAt?: boolean
    crisis?: boolean | CrisisDefaultArgs<ExtArgs>
    madeBy?: boolean | UserDefaultArgs<ExtArgs>
  }, ExtArgs["result"]["decision"]>

  export type DecisionSelectCreateManyAndReturn<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetSelect<{
    id?: boolean
    crisisId?: boolean
    title?: boolean
    decisionText?: boolean
    rationale?: boolean
    confidenceScore?: boolean
    optionA?: boolean
    optionB?: boolean
    optionC?: boolean
    selectedOption?: boolean
    outcome?: boolean
    madeById?: boolean
    createdAt?: boolean
    updatedAt?: boolean
    crisis?: boolean | CrisisDefaultArgs<ExtArgs>
    madeBy?: boolean | UserDefaultArgs<ExtArgs>
  }, ExtArgs["result"]["decision"]>

  export type DecisionSelectUpdateManyAndReturn<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetSelect<{
    id?: boolean
    crisisId?: boolean
    title?: boolean
    decisionText?: boolean
    rationale?: boolean
    confidenceScore?: boolean
    optionA?: boolean
    optionB?: boolean
    optionC?: boolean
    selectedOption?: boolean
    outcome?: boolean
    madeById?: boolean
    createdAt?: boolean
    updatedAt?: boolean
    crisis?: boolean | CrisisDefaultArgs<ExtArgs>
    madeBy?: boolean | UserDefaultArgs<ExtArgs>
  }, ExtArgs["result"]["decision"]>

  export type DecisionSelectScalar = {
    id?: boolean
    crisisId?: boolean
    title?: boolean
    decisionText?: boolean
    rationale?: boolean
    confidenceScore?: boolean
    optionA?: boolean
    optionB?: boolean
    optionC?: boolean
    selectedOption?: boolean
    outcome?: boolean
    madeById?: boolean
    createdAt?: boolean
    updatedAt?: boolean
  }

  export type DecisionOmit<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetOmit<"id" | "crisisId" | "title" | "decisionText" | "rationale" | "confidenceScore" | "optionA" | "optionB" | "optionC" | "selectedOption" | "outcome" | "madeById" | "createdAt" | "updatedAt", ExtArgs["result"]["decision"]>
  export type DecisionInclude<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    crisis?: boolean | CrisisDefaultArgs<ExtArgs>
    madeBy?: boolean | UserDefaultArgs<ExtArgs>
  }
  export type DecisionIncludeCreateManyAndReturn<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    crisis?: boolean | CrisisDefaultArgs<ExtArgs>
    madeBy?: boolean | UserDefaultArgs<ExtArgs>
  }
  export type DecisionIncludeUpdateManyAndReturn<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    crisis?: boolean | CrisisDefaultArgs<ExtArgs>
    madeBy?: boolean | UserDefaultArgs<ExtArgs>
  }

  export type $DecisionPayload<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    name: "Decision"
    objects: {
      crisis: Prisma.$CrisisPayload<ExtArgs>
      madeBy: Prisma.$UserPayload<ExtArgs>
    }
    scalars: $Extensions.GetPayloadResult<{
      id: string
      crisisId: string
      title: string
      decisionText: string
      rationale: string | null
      confidenceScore: number
      optionA: string | null
      optionB: string | null
      optionC: string | null
      selectedOption: $Enums.SelectedOption
      outcome: string | null
      madeById: string
      createdAt: Date
      updatedAt: Date
    }, ExtArgs["result"]["decision"]>
    composites: {}
  }

  type DecisionGetPayload<S extends boolean | null | undefined | DecisionDefaultArgs> = $Result.GetResult<Prisma.$DecisionPayload, S>

  type DecisionCountArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> =
    Omit<DecisionFindManyArgs, 'select' | 'include' | 'distinct' | 'omit'> & {
      select?: DecisionCountAggregateInputType | true
    }

  export interface DecisionDelegate<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs, GlobalOmitOptions = {}> {
    [K: symbol]: { types: Prisma.TypeMap<ExtArgs>['model']['Decision'], meta: { name: 'Decision' } }
    /**
     * Find zero or one Decision that matches the filter.
     * @param {DecisionFindUniqueArgs} args - Arguments to find a Decision
     * @example
     * // Get one Decision
     * const decision = await prisma.decision.findUnique({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findUnique<T extends DecisionFindUniqueArgs>(args: SelectSubset<T, DecisionFindUniqueArgs<ExtArgs>>): Prisma__DecisionClient<$Result.GetResult<Prisma.$DecisionPayload<ExtArgs>, T, "findUnique", GlobalOmitOptions> | null, null, ExtArgs, GlobalOmitOptions>

    /**
     * Find one Decision that matches the filter or throw an error with `error.code='P2025'`
     * if no matches were found.
     * @param {DecisionFindUniqueOrThrowArgs} args - Arguments to find a Decision
     * @example
     * // Get one Decision
     * const decision = await prisma.decision.findUniqueOrThrow({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findUniqueOrThrow<T extends DecisionFindUniqueOrThrowArgs>(args: SelectSubset<T, DecisionFindUniqueOrThrowArgs<ExtArgs>>): Prisma__DecisionClient<$Result.GetResult<Prisma.$DecisionPayload<ExtArgs>, T, "findUniqueOrThrow", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Find the first Decision that matches the filter.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {DecisionFindFirstArgs} args - Arguments to find a Decision
     * @example
     * // Get one Decision
     * const decision = await prisma.decision.findFirst({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findFirst<T extends DecisionFindFirstArgs>(args?: SelectSubset<T, DecisionFindFirstArgs<ExtArgs>>): Prisma__DecisionClient<$Result.GetResult<Prisma.$DecisionPayload<ExtArgs>, T, "findFirst", GlobalOmitOptions> | null, null, ExtArgs, GlobalOmitOptions>

    /**
     * Find the first Decision that matches the filter or
     * throw `PrismaKnownClientError` with `P2025` code if no matches were found.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {DecisionFindFirstOrThrowArgs} args - Arguments to find a Decision
     * @example
     * // Get one Decision
     * const decision = await prisma.decision.findFirstOrThrow({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findFirstOrThrow<T extends DecisionFindFirstOrThrowArgs>(args?: SelectSubset<T, DecisionFindFirstOrThrowArgs<ExtArgs>>): Prisma__DecisionClient<$Result.GetResult<Prisma.$DecisionPayload<ExtArgs>, T, "findFirstOrThrow", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Find zero or more Decisions that matches the filter.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {DecisionFindManyArgs} args - Arguments to filter and select certain fields only.
     * @example
     * // Get all Decisions
     * const decisions = await prisma.decision.findMany()
     * 
     * // Get first 10 Decisions
     * const decisions = await prisma.decision.findMany({ take: 10 })
     * 
     * // Only select the `id`
     * const decisionWithIdOnly = await prisma.decision.findMany({ select: { id: true } })
     * 
     */
    findMany<T extends DecisionFindManyArgs>(args?: SelectSubset<T, DecisionFindManyArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$DecisionPayload<ExtArgs>, T, "findMany", GlobalOmitOptions>>

    /**
     * Create a Decision.
     * @param {DecisionCreateArgs} args - Arguments to create a Decision.
     * @example
     * // Create one Decision
     * const Decision = await prisma.decision.create({
     *   data: {
     *     // ... data to create a Decision
     *   }
     * })
     * 
     */
    create<T extends DecisionCreateArgs>(args: SelectSubset<T, DecisionCreateArgs<ExtArgs>>): Prisma__DecisionClient<$Result.GetResult<Prisma.$DecisionPayload<ExtArgs>, T, "create", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Create many Decisions.
     * @param {DecisionCreateManyArgs} args - Arguments to create many Decisions.
     * @example
     * // Create many Decisions
     * const decision = await prisma.decision.createMany({
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     *     
     */
    createMany<T extends DecisionCreateManyArgs>(args?: SelectSubset<T, DecisionCreateManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Create many Decisions and returns the data saved in the database.
     * @param {DecisionCreateManyAndReturnArgs} args - Arguments to create many Decisions.
     * @example
     * // Create many Decisions
     * const decision = await prisma.decision.createManyAndReturn({
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * 
     * // Create many Decisions and only return the `id`
     * const decisionWithIdOnly = await prisma.decision.createManyAndReturn({
     *   select: { id: true },
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * 
     */
    createManyAndReturn<T extends DecisionCreateManyAndReturnArgs>(args?: SelectSubset<T, DecisionCreateManyAndReturnArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$DecisionPayload<ExtArgs>, T, "createManyAndReturn", GlobalOmitOptions>>

    /**
     * Delete a Decision.
     * @param {DecisionDeleteArgs} args - Arguments to delete one Decision.
     * @example
     * // Delete one Decision
     * const Decision = await prisma.decision.delete({
     *   where: {
     *     // ... filter to delete one Decision
     *   }
     * })
     * 
     */
    delete<T extends DecisionDeleteArgs>(args: SelectSubset<T, DecisionDeleteArgs<ExtArgs>>): Prisma__DecisionClient<$Result.GetResult<Prisma.$DecisionPayload<ExtArgs>, T, "delete", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Update one Decision.
     * @param {DecisionUpdateArgs} args - Arguments to update one Decision.
     * @example
     * // Update one Decision
     * const decision = await prisma.decision.update({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: {
     *     // ... provide data here
     *   }
     * })
     * 
     */
    update<T extends DecisionUpdateArgs>(args: SelectSubset<T, DecisionUpdateArgs<ExtArgs>>): Prisma__DecisionClient<$Result.GetResult<Prisma.$DecisionPayload<ExtArgs>, T, "update", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Delete zero or more Decisions.
     * @param {DecisionDeleteManyArgs} args - Arguments to filter Decisions to delete.
     * @example
     * // Delete a few Decisions
     * const { count } = await prisma.decision.deleteMany({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     * 
     */
    deleteMany<T extends DecisionDeleteManyArgs>(args?: SelectSubset<T, DecisionDeleteManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Update zero or more Decisions.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {DecisionUpdateManyArgs} args - Arguments to update one or more rows.
     * @example
     * // Update many Decisions
     * const decision = await prisma.decision.updateMany({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: {
     *     // ... provide data here
     *   }
     * })
     * 
     */
    updateMany<T extends DecisionUpdateManyArgs>(args: SelectSubset<T, DecisionUpdateManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Update zero or more Decisions and returns the data updated in the database.
     * @param {DecisionUpdateManyAndReturnArgs} args - Arguments to update many Decisions.
     * @example
     * // Update many Decisions
     * const decision = await prisma.decision.updateManyAndReturn({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * 
     * // Update zero or more Decisions and only return the `id`
     * const decisionWithIdOnly = await prisma.decision.updateManyAndReturn({
     *   select: { id: true },
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * 
     */
    updateManyAndReturn<T extends DecisionUpdateManyAndReturnArgs>(args: SelectSubset<T, DecisionUpdateManyAndReturnArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$DecisionPayload<ExtArgs>, T, "updateManyAndReturn", GlobalOmitOptions>>

    /**
     * Create or update one Decision.
     * @param {DecisionUpsertArgs} args - Arguments to update or create a Decision.
     * @example
     * // Update or create a Decision
     * const decision = await prisma.decision.upsert({
     *   create: {
     *     // ... data to create a Decision
     *   },
     *   update: {
     *     // ... in case it already exists, update
     *   },
     *   where: {
     *     // ... the filter for the Decision we want to update
     *   }
     * })
     */
    upsert<T extends DecisionUpsertArgs>(args: SelectSubset<T, DecisionUpsertArgs<ExtArgs>>): Prisma__DecisionClient<$Result.GetResult<Prisma.$DecisionPayload<ExtArgs>, T, "upsert", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>


    /**
     * Count the number of Decisions.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {DecisionCountArgs} args - Arguments to filter Decisions to count.
     * @example
     * // Count the number of Decisions
     * const count = await prisma.decision.count({
     *   where: {
     *     // ... the filter for the Decisions we want to count
     *   }
     * })
    **/
    count<T extends DecisionCountArgs>(
      args?: Subset<T, DecisionCountArgs>,
    ): Prisma.PrismaPromise<
      T extends $Utils.Record<'select', any>
        ? T['select'] extends true
          ? number
          : GetScalarType<T['select'], DecisionCountAggregateOutputType>
        : number
    >

    /**
     * Allows you to perform aggregations operations on a Decision.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {DecisionAggregateArgs} args - Select which aggregations you would like to apply and on what fields.
     * @example
     * // Ordered by age ascending
     * // Where email contains prisma.io
     * // Limited to the 10 users
     * const aggregations = await prisma.user.aggregate({
     *   _avg: {
     *     age: true,
     *   },
     *   where: {
     *     email: {
     *       contains: "prisma.io",
     *     },
     *   },
     *   orderBy: {
     *     age: "asc",
     *   },
     *   take: 10,
     * })
    **/
    aggregate<T extends DecisionAggregateArgs>(args: Subset<T, DecisionAggregateArgs>): Prisma.PrismaPromise<GetDecisionAggregateType<T>>

    /**
     * Group by Decision.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {DecisionGroupByArgs} args - Group by arguments.
     * @example
     * // Group by city, order by createdAt, get count
     * const result = await prisma.user.groupBy({
     *   by: ['city', 'createdAt'],
     *   orderBy: {
     *     createdAt: true
     *   },
     *   _count: {
     *     _all: true
     *   },
     * })
     * 
    **/
    groupBy<
      T extends DecisionGroupByArgs,
      HasSelectOrTake extends Or<
        Extends<'skip', Keys<T>>,
        Extends<'take', Keys<T>>
      >,
      OrderByArg extends True extends HasSelectOrTake
        ? { orderBy: DecisionGroupByArgs['orderBy'] }
        : { orderBy?: DecisionGroupByArgs['orderBy'] },
      OrderFields extends ExcludeUnderscoreKeys<Keys<MaybeTupleToUnion<T['orderBy']>>>,
      ByFields extends MaybeTupleToUnion<T['by']>,
      ByValid extends Has<ByFields, OrderFields>,
      HavingFields extends GetHavingFields<T['having']>,
      HavingValid extends Has<ByFields, HavingFields>,
      ByEmpty extends T['by'] extends never[] ? True : False,
      InputErrors extends ByEmpty extends True
      ? `Error: "by" must not be empty.`
      : HavingValid extends False
      ? {
          [P in HavingFields]: P extends ByFields
            ? never
            : P extends string
            ? `Error: Field "${P}" used in "having" needs to be provided in "by".`
            : [
                Error,
                'Field ',
                P,
                ` in "having" needs to be provided in "by"`,
              ]
        }[HavingFields]
      : 'take' extends Keys<T>
      ? 'orderBy' extends Keys<T>
        ? ByValid extends True
          ? {}
          : {
              [P in OrderFields]: P extends ByFields
                ? never
                : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
            }[OrderFields]
        : 'Error: If you provide "take", you also need to provide "orderBy"'
      : 'skip' extends Keys<T>
      ? 'orderBy' extends Keys<T>
        ? ByValid extends True
          ? {}
          : {
              [P in OrderFields]: P extends ByFields
                ? never
                : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
            }[OrderFields]
        : 'Error: If you provide "skip", you also need to provide "orderBy"'
      : ByValid extends True
      ? {}
      : {
          [P in OrderFields]: P extends ByFields
            ? never
            : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
        }[OrderFields]
    >(args: SubsetIntersection<T, DecisionGroupByArgs, OrderByArg> & InputErrors): {} extends InputErrors ? GetDecisionGroupByPayload<T> : Prisma.PrismaPromise<InputErrors>
  /**
   * Fields of the Decision model
   */
  readonly fields: DecisionFieldRefs;
  }

  /**
   * The delegate class that acts as a "Promise-like" for Decision.
   * Why is this prefixed with `Prisma__`?
   * Because we want to prevent naming conflicts as mentioned in
   * https://github.com/prisma/prisma-client-js/issues/707
   */
  export interface Prisma__DecisionClient<T, Null = never, ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs, GlobalOmitOptions = {}> extends Prisma.PrismaPromise<T> {
    readonly [Symbol.toStringTag]: "PrismaPromise"
    crisis<T extends CrisisDefaultArgs<ExtArgs> = {}>(args?: Subset<T, CrisisDefaultArgs<ExtArgs>>): Prisma__CrisisClient<$Result.GetResult<Prisma.$CrisisPayload<ExtArgs>, T, "findUniqueOrThrow", GlobalOmitOptions> | Null, Null, ExtArgs, GlobalOmitOptions>
    madeBy<T extends UserDefaultArgs<ExtArgs> = {}>(args?: Subset<T, UserDefaultArgs<ExtArgs>>): Prisma__UserClient<$Result.GetResult<Prisma.$UserPayload<ExtArgs>, T, "findUniqueOrThrow", GlobalOmitOptions> | Null, Null, ExtArgs, GlobalOmitOptions>
    /**
     * Attaches callbacks for the resolution and/or rejection of the Promise.
     * @param onfulfilled The callback to execute when the Promise is resolved.
     * @param onrejected The callback to execute when the Promise is rejected.
     * @returns A Promise for the completion of which ever callback is executed.
     */
    then<TResult1 = T, TResult2 = never>(onfulfilled?: ((value: T) => TResult1 | PromiseLike<TResult1>) | undefined | null, onrejected?: ((reason: any) => TResult2 | PromiseLike<TResult2>) | undefined | null): $Utils.JsPromise<TResult1 | TResult2>
    /**
     * Attaches a callback for only the rejection of the Promise.
     * @param onrejected The callback to execute when the Promise is rejected.
     * @returns A Promise for the completion of the callback.
     */
    catch<TResult = never>(onrejected?: ((reason: any) => TResult | PromiseLike<TResult>) | undefined | null): $Utils.JsPromise<T | TResult>
    /**
     * Attaches a callback that is invoked when the Promise is settled (fulfilled or rejected). The
     * resolved value cannot be modified from the callback.
     * @param onfinally The callback to execute when the Promise is settled (fulfilled or rejected).
     * @returns A Promise for the completion of the callback.
     */
    finally(onfinally?: (() => void) | undefined | null): $Utils.JsPromise<T>
  }




  /**
   * Fields of the Decision model
   */
  interface DecisionFieldRefs {
    readonly id: FieldRef<"Decision", 'String'>
    readonly crisisId: FieldRef<"Decision", 'String'>
    readonly title: FieldRef<"Decision", 'String'>
    readonly decisionText: FieldRef<"Decision", 'String'>
    readonly rationale: FieldRef<"Decision", 'String'>
    readonly confidenceScore: FieldRef<"Decision", 'Int'>
    readonly optionA: FieldRef<"Decision", 'String'>
    readonly optionB: FieldRef<"Decision", 'String'>
    readonly optionC: FieldRef<"Decision", 'String'>
    readonly selectedOption: FieldRef<"Decision", 'SelectedOption'>
    readonly outcome: FieldRef<"Decision", 'String'>
    readonly madeById: FieldRef<"Decision", 'String'>
    readonly createdAt: FieldRef<"Decision", 'DateTime'>
    readonly updatedAt: FieldRef<"Decision", 'DateTime'>
  }
    

  // Custom InputTypes
  /**
   * Decision findUnique
   */
  export type DecisionFindUniqueArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Decision
     */
    select?: DecisionSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Decision
     */
    omit?: DecisionOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: DecisionInclude<ExtArgs> | null
    /**
     * Filter, which Decision to fetch.
     */
    where: DecisionWhereUniqueInput
  }

  /**
   * Decision findUniqueOrThrow
   */
  export type DecisionFindUniqueOrThrowArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Decision
     */
    select?: DecisionSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Decision
     */
    omit?: DecisionOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: DecisionInclude<ExtArgs> | null
    /**
     * Filter, which Decision to fetch.
     */
    where: DecisionWhereUniqueInput
  }

  /**
   * Decision findFirst
   */
  export type DecisionFindFirstArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Decision
     */
    select?: DecisionSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Decision
     */
    omit?: DecisionOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: DecisionInclude<ExtArgs> | null
    /**
     * Filter, which Decision to fetch.
     */
    where?: DecisionWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of Decisions to fetch.
     */
    orderBy?: DecisionOrderByWithRelationInput | DecisionOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for searching for Decisions.
     */
    cursor?: DecisionWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` Decisions from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` Decisions.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/distinct Distinct Docs}
     * 
     * Filter by unique combinations of Decisions.
     */
    distinct?: DecisionScalarFieldEnum | DecisionScalarFieldEnum[]
  }

  /**
   * Decision findFirstOrThrow
   */
  export type DecisionFindFirstOrThrowArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Decision
     */
    select?: DecisionSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Decision
     */
    omit?: DecisionOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: DecisionInclude<ExtArgs> | null
    /**
     * Filter, which Decision to fetch.
     */
    where?: DecisionWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of Decisions to fetch.
     */
    orderBy?: DecisionOrderByWithRelationInput | DecisionOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for searching for Decisions.
     */
    cursor?: DecisionWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` Decisions from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` Decisions.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/distinct Distinct Docs}
     * 
     * Filter by unique combinations of Decisions.
     */
    distinct?: DecisionScalarFieldEnum | DecisionScalarFieldEnum[]
  }

  /**
   * Decision findMany
   */
  export type DecisionFindManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Decision
     */
    select?: DecisionSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Decision
     */
    omit?: DecisionOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: DecisionInclude<ExtArgs> | null
    /**
     * Filter, which Decisions to fetch.
     */
    where?: DecisionWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of Decisions to fetch.
     */
    orderBy?: DecisionOrderByWithRelationInput | DecisionOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for listing Decisions.
     */
    cursor?: DecisionWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` Decisions from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` Decisions.
     */
    skip?: number
    distinct?: DecisionScalarFieldEnum | DecisionScalarFieldEnum[]
  }

  /**
   * Decision create
   */
  export type DecisionCreateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Decision
     */
    select?: DecisionSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Decision
     */
    omit?: DecisionOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: DecisionInclude<ExtArgs> | null
    /**
     * The data needed to create a Decision.
     */
    data: XOR<DecisionCreateInput, DecisionUncheckedCreateInput>
  }

  /**
   * Decision createMany
   */
  export type DecisionCreateManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * The data used to create many Decisions.
     */
    data: DecisionCreateManyInput | DecisionCreateManyInput[]
    skipDuplicates?: boolean
  }

  /**
   * Decision createManyAndReturn
   */
  export type DecisionCreateManyAndReturnArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Decision
     */
    select?: DecisionSelectCreateManyAndReturn<ExtArgs> | null
    /**
     * Omit specific fields from the Decision
     */
    omit?: DecisionOmit<ExtArgs> | null
    /**
     * The data used to create many Decisions.
     */
    data: DecisionCreateManyInput | DecisionCreateManyInput[]
    skipDuplicates?: boolean
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: DecisionIncludeCreateManyAndReturn<ExtArgs> | null
  }

  /**
   * Decision update
   */
  export type DecisionUpdateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Decision
     */
    select?: DecisionSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Decision
     */
    omit?: DecisionOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: DecisionInclude<ExtArgs> | null
    /**
     * The data needed to update a Decision.
     */
    data: XOR<DecisionUpdateInput, DecisionUncheckedUpdateInput>
    /**
     * Choose, which Decision to update.
     */
    where: DecisionWhereUniqueInput
  }

  /**
   * Decision updateMany
   */
  export type DecisionUpdateManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * The data used to update Decisions.
     */
    data: XOR<DecisionUpdateManyMutationInput, DecisionUncheckedUpdateManyInput>
    /**
     * Filter which Decisions to update
     */
    where?: DecisionWhereInput
    /**
     * Limit how many Decisions to update.
     */
    limit?: number
  }

  /**
   * Decision updateManyAndReturn
   */
  export type DecisionUpdateManyAndReturnArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Decision
     */
    select?: DecisionSelectUpdateManyAndReturn<ExtArgs> | null
    /**
     * Omit specific fields from the Decision
     */
    omit?: DecisionOmit<ExtArgs> | null
    /**
     * The data used to update Decisions.
     */
    data: XOR<DecisionUpdateManyMutationInput, DecisionUncheckedUpdateManyInput>
    /**
     * Filter which Decisions to update
     */
    where?: DecisionWhereInput
    /**
     * Limit how many Decisions to update.
     */
    limit?: number
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: DecisionIncludeUpdateManyAndReturn<ExtArgs> | null
  }

  /**
   * Decision upsert
   */
  export type DecisionUpsertArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Decision
     */
    select?: DecisionSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Decision
     */
    omit?: DecisionOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: DecisionInclude<ExtArgs> | null
    /**
     * The filter to search for the Decision to update in case it exists.
     */
    where: DecisionWhereUniqueInput
    /**
     * In case the Decision found by the `where` argument doesn't exist, create a new Decision with this data.
     */
    create: XOR<DecisionCreateInput, DecisionUncheckedCreateInput>
    /**
     * In case the Decision was found with the provided `where` argument, update it with this data.
     */
    update: XOR<DecisionUpdateInput, DecisionUncheckedUpdateInput>
  }

  /**
   * Decision delete
   */
  export type DecisionDeleteArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Decision
     */
    select?: DecisionSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Decision
     */
    omit?: DecisionOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: DecisionInclude<ExtArgs> | null
    /**
     * Filter which Decision to delete.
     */
    where: DecisionWhereUniqueInput
  }

  /**
   * Decision deleteMany
   */
  export type DecisionDeleteManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Filter which Decisions to delete
     */
    where?: DecisionWhereInput
    /**
     * Limit how many Decisions to delete.
     */
    limit?: number
  }

  /**
   * Decision without action
   */
  export type DecisionDefaultArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Decision
     */
    select?: DecisionSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Decision
     */
    omit?: DecisionOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: DecisionInclude<ExtArgs> | null
  }


  /**
   * Model Alert
   */

  export type AggregateAlert = {
    _count: AlertCountAggregateOutputType | null
    _min: AlertMinAggregateOutputType | null
    _max: AlertMaxAggregateOutputType | null
  }

  export type AlertMinAggregateOutputType = {
    id: string | null
    crisisId: string | null
    type: $Enums.AlertType | null
    severity: $Enums.AlertSeverity | null
    message: string | null
    isActive: boolean | null
    triggeredAt: Date | null
    resolvedAt: Date | null
  }

  export type AlertMaxAggregateOutputType = {
    id: string | null
    crisisId: string | null
    type: $Enums.AlertType | null
    severity: $Enums.AlertSeverity | null
    message: string | null
    isActive: boolean | null
    triggeredAt: Date | null
    resolvedAt: Date | null
  }

  export type AlertCountAggregateOutputType = {
    id: number
    crisisId: number
    type: number
    severity: number
    message: number
    isActive: number
    triggeredAt: number
    resolvedAt: number
    _all: number
  }


  export type AlertMinAggregateInputType = {
    id?: true
    crisisId?: true
    type?: true
    severity?: true
    message?: true
    isActive?: true
    triggeredAt?: true
    resolvedAt?: true
  }

  export type AlertMaxAggregateInputType = {
    id?: true
    crisisId?: true
    type?: true
    severity?: true
    message?: true
    isActive?: true
    triggeredAt?: true
    resolvedAt?: true
  }

  export type AlertCountAggregateInputType = {
    id?: true
    crisisId?: true
    type?: true
    severity?: true
    message?: true
    isActive?: true
    triggeredAt?: true
    resolvedAt?: true
    _all?: true
  }

  export type AlertAggregateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Filter which Alert to aggregate.
     */
    where?: AlertWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of Alerts to fetch.
     */
    orderBy?: AlertOrderByWithRelationInput | AlertOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the start position
     */
    cursor?: AlertWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` Alerts from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` Alerts.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Count returned Alerts
    **/
    _count?: true | AlertCountAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to find the minimum value
    **/
    _min?: AlertMinAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to find the maximum value
    **/
    _max?: AlertMaxAggregateInputType
  }

  export type GetAlertAggregateType<T extends AlertAggregateArgs> = {
        [P in keyof T & keyof AggregateAlert]: P extends '_count' | 'count'
      ? T[P] extends true
        ? number
        : GetScalarType<T[P], AggregateAlert[P]>
      : GetScalarType<T[P], AggregateAlert[P]>
  }




  export type AlertGroupByArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    where?: AlertWhereInput
    orderBy?: AlertOrderByWithAggregationInput | AlertOrderByWithAggregationInput[]
    by: AlertScalarFieldEnum[] | AlertScalarFieldEnum
    having?: AlertScalarWhereWithAggregatesInput
    take?: number
    skip?: number
    _count?: AlertCountAggregateInputType | true
    _min?: AlertMinAggregateInputType
    _max?: AlertMaxAggregateInputType
  }

  export type AlertGroupByOutputType = {
    id: string
    crisisId: string
    type: $Enums.AlertType
    severity: $Enums.AlertSeverity
    message: string
    isActive: boolean
    triggeredAt: Date
    resolvedAt: Date | null
    _count: AlertCountAggregateOutputType | null
    _min: AlertMinAggregateOutputType | null
    _max: AlertMaxAggregateOutputType | null
  }

  type GetAlertGroupByPayload<T extends AlertGroupByArgs> = Prisma.PrismaPromise<
    Array<
      PickEnumerable<AlertGroupByOutputType, T['by']> &
        {
          [P in ((keyof T) & (keyof AlertGroupByOutputType))]: P extends '_count'
            ? T[P] extends boolean
              ? number
              : GetScalarType<T[P], AlertGroupByOutputType[P]>
            : GetScalarType<T[P], AlertGroupByOutputType[P]>
        }
      >
    >


  export type AlertSelect<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetSelect<{
    id?: boolean
    crisisId?: boolean
    type?: boolean
    severity?: boolean
    message?: boolean
    isActive?: boolean
    triggeredAt?: boolean
    resolvedAt?: boolean
    crisis?: boolean | CrisisDefaultArgs<ExtArgs>
  }, ExtArgs["result"]["alert"]>

  export type AlertSelectCreateManyAndReturn<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetSelect<{
    id?: boolean
    crisisId?: boolean
    type?: boolean
    severity?: boolean
    message?: boolean
    isActive?: boolean
    triggeredAt?: boolean
    resolvedAt?: boolean
    crisis?: boolean | CrisisDefaultArgs<ExtArgs>
  }, ExtArgs["result"]["alert"]>

  export type AlertSelectUpdateManyAndReturn<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetSelect<{
    id?: boolean
    crisisId?: boolean
    type?: boolean
    severity?: boolean
    message?: boolean
    isActive?: boolean
    triggeredAt?: boolean
    resolvedAt?: boolean
    crisis?: boolean | CrisisDefaultArgs<ExtArgs>
  }, ExtArgs["result"]["alert"]>

  export type AlertSelectScalar = {
    id?: boolean
    crisisId?: boolean
    type?: boolean
    severity?: boolean
    message?: boolean
    isActive?: boolean
    triggeredAt?: boolean
    resolvedAt?: boolean
  }

  export type AlertOmit<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetOmit<"id" | "crisisId" | "type" | "severity" | "message" | "isActive" | "triggeredAt" | "resolvedAt", ExtArgs["result"]["alert"]>
  export type AlertInclude<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    crisis?: boolean | CrisisDefaultArgs<ExtArgs>
  }
  export type AlertIncludeCreateManyAndReturn<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    crisis?: boolean | CrisisDefaultArgs<ExtArgs>
  }
  export type AlertIncludeUpdateManyAndReturn<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    crisis?: boolean | CrisisDefaultArgs<ExtArgs>
  }

  export type $AlertPayload<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    name: "Alert"
    objects: {
      crisis: Prisma.$CrisisPayload<ExtArgs>
    }
    scalars: $Extensions.GetPayloadResult<{
      id: string
      crisisId: string
      type: $Enums.AlertType
      severity: $Enums.AlertSeverity
      message: string
      isActive: boolean
      triggeredAt: Date
      resolvedAt: Date | null
    }, ExtArgs["result"]["alert"]>
    composites: {}
  }

  type AlertGetPayload<S extends boolean | null | undefined | AlertDefaultArgs> = $Result.GetResult<Prisma.$AlertPayload, S>

  type AlertCountArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> =
    Omit<AlertFindManyArgs, 'select' | 'include' | 'distinct' | 'omit'> & {
      select?: AlertCountAggregateInputType | true
    }

  export interface AlertDelegate<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs, GlobalOmitOptions = {}> {
    [K: symbol]: { types: Prisma.TypeMap<ExtArgs>['model']['Alert'], meta: { name: 'Alert' } }
    /**
     * Find zero or one Alert that matches the filter.
     * @param {AlertFindUniqueArgs} args - Arguments to find a Alert
     * @example
     * // Get one Alert
     * const alert = await prisma.alert.findUnique({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findUnique<T extends AlertFindUniqueArgs>(args: SelectSubset<T, AlertFindUniqueArgs<ExtArgs>>): Prisma__AlertClient<$Result.GetResult<Prisma.$AlertPayload<ExtArgs>, T, "findUnique", GlobalOmitOptions> | null, null, ExtArgs, GlobalOmitOptions>

    /**
     * Find one Alert that matches the filter or throw an error with `error.code='P2025'`
     * if no matches were found.
     * @param {AlertFindUniqueOrThrowArgs} args - Arguments to find a Alert
     * @example
     * // Get one Alert
     * const alert = await prisma.alert.findUniqueOrThrow({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findUniqueOrThrow<T extends AlertFindUniqueOrThrowArgs>(args: SelectSubset<T, AlertFindUniqueOrThrowArgs<ExtArgs>>): Prisma__AlertClient<$Result.GetResult<Prisma.$AlertPayload<ExtArgs>, T, "findUniqueOrThrow", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Find the first Alert that matches the filter.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {AlertFindFirstArgs} args - Arguments to find a Alert
     * @example
     * // Get one Alert
     * const alert = await prisma.alert.findFirst({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findFirst<T extends AlertFindFirstArgs>(args?: SelectSubset<T, AlertFindFirstArgs<ExtArgs>>): Prisma__AlertClient<$Result.GetResult<Prisma.$AlertPayload<ExtArgs>, T, "findFirst", GlobalOmitOptions> | null, null, ExtArgs, GlobalOmitOptions>

    /**
     * Find the first Alert that matches the filter or
     * throw `PrismaKnownClientError` with `P2025` code if no matches were found.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {AlertFindFirstOrThrowArgs} args - Arguments to find a Alert
     * @example
     * // Get one Alert
     * const alert = await prisma.alert.findFirstOrThrow({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findFirstOrThrow<T extends AlertFindFirstOrThrowArgs>(args?: SelectSubset<T, AlertFindFirstOrThrowArgs<ExtArgs>>): Prisma__AlertClient<$Result.GetResult<Prisma.$AlertPayload<ExtArgs>, T, "findFirstOrThrow", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Find zero or more Alerts that matches the filter.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {AlertFindManyArgs} args - Arguments to filter and select certain fields only.
     * @example
     * // Get all Alerts
     * const alerts = await prisma.alert.findMany()
     * 
     * // Get first 10 Alerts
     * const alerts = await prisma.alert.findMany({ take: 10 })
     * 
     * // Only select the `id`
     * const alertWithIdOnly = await prisma.alert.findMany({ select: { id: true } })
     * 
     */
    findMany<T extends AlertFindManyArgs>(args?: SelectSubset<T, AlertFindManyArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$AlertPayload<ExtArgs>, T, "findMany", GlobalOmitOptions>>

    /**
     * Create a Alert.
     * @param {AlertCreateArgs} args - Arguments to create a Alert.
     * @example
     * // Create one Alert
     * const Alert = await prisma.alert.create({
     *   data: {
     *     // ... data to create a Alert
     *   }
     * })
     * 
     */
    create<T extends AlertCreateArgs>(args: SelectSubset<T, AlertCreateArgs<ExtArgs>>): Prisma__AlertClient<$Result.GetResult<Prisma.$AlertPayload<ExtArgs>, T, "create", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Create many Alerts.
     * @param {AlertCreateManyArgs} args - Arguments to create many Alerts.
     * @example
     * // Create many Alerts
     * const alert = await prisma.alert.createMany({
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     *     
     */
    createMany<T extends AlertCreateManyArgs>(args?: SelectSubset<T, AlertCreateManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Create many Alerts and returns the data saved in the database.
     * @param {AlertCreateManyAndReturnArgs} args - Arguments to create many Alerts.
     * @example
     * // Create many Alerts
     * const alert = await prisma.alert.createManyAndReturn({
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * 
     * // Create many Alerts and only return the `id`
     * const alertWithIdOnly = await prisma.alert.createManyAndReturn({
     *   select: { id: true },
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * 
     */
    createManyAndReturn<T extends AlertCreateManyAndReturnArgs>(args?: SelectSubset<T, AlertCreateManyAndReturnArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$AlertPayload<ExtArgs>, T, "createManyAndReturn", GlobalOmitOptions>>

    /**
     * Delete a Alert.
     * @param {AlertDeleteArgs} args - Arguments to delete one Alert.
     * @example
     * // Delete one Alert
     * const Alert = await prisma.alert.delete({
     *   where: {
     *     // ... filter to delete one Alert
     *   }
     * })
     * 
     */
    delete<T extends AlertDeleteArgs>(args: SelectSubset<T, AlertDeleteArgs<ExtArgs>>): Prisma__AlertClient<$Result.GetResult<Prisma.$AlertPayload<ExtArgs>, T, "delete", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Update one Alert.
     * @param {AlertUpdateArgs} args - Arguments to update one Alert.
     * @example
     * // Update one Alert
     * const alert = await prisma.alert.update({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: {
     *     // ... provide data here
     *   }
     * })
     * 
     */
    update<T extends AlertUpdateArgs>(args: SelectSubset<T, AlertUpdateArgs<ExtArgs>>): Prisma__AlertClient<$Result.GetResult<Prisma.$AlertPayload<ExtArgs>, T, "update", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Delete zero or more Alerts.
     * @param {AlertDeleteManyArgs} args - Arguments to filter Alerts to delete.
     * @example
     * // Delete a few Alerts
     * const { count } = await prisma.alert.deleteMany({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     * 
     */
    deleteMany<T extends AlertDeleteManyArgs>(args?: SelectSubset<T, AlertDeleteManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Update zero or more Alerts.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {AlertUpdateManyArgs} args - Arguments to update one or more rows.
     * @example
     * // Update many Alerts
     * const alert = await prisma.alert.updateMany({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: {
     *     // ... provide data here
     *   }
     * })
     * 
     */
    updateMany<T extends AlertUpdateManyArgs>(args: SelectSubset<T, AlertUpdateManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Update zero or more Alerts and returns the data updated in the database.
     * @param {AlertUpdateManyAndReturnArgs} args - Arguments to update many Alerts.
     * @example
     * // Update many Alerts
     * const alert = await prisma.alert.updateManyAndReturn({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * 
     * // Update zero or more Alerts and only return the `id`
     * const alertWithIdOnly = await prisma.alert.updateManyAndReturn({
     *   select: { id: true },
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * 
     */
    updateManyAndReturn<T extends AlertUpdateManyAndReturnArgs>(args: SelectSubset<T, AlertUpdateManyAndReturnArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$AlertPayload<ExtArgs>, T, "updateManyAndReturn", GlobalOmitOptions>>

    /**
     * Create or update one Alert.
     * @param {AlertUpsertArgs} args - Arguments to update or create a Alert.
     * @example
     * // Update or create a Alert
     * const alert = await prisma.alert.upsert({
     *   create: {
     *     // ... data to create a Alert
     *   },
     *   update: {
     *     // ... in case it already exists, update
     *   },
     *   where: {
     *     // ... the filter for the Alert we want to update
     *   }
     * })
     */
    upsert<T extends AlertUpsertArgs>(args: SelectSubset<T, AlertUpsertArgs<ExtArgs>>): Prisma__AlertClient<$Result.GetResult<Prisma.$AlertPayload<ExtArgs>, T, "upsert", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>


    /**
     * Count the number of Alerts.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {AlertCountArgs} args - Arguments to filter Alerts to count.
     * @example
     * // Count the number of Alerts
     * const count = await prisma.alert.count({
     *   where: {
     *     // ... the filter for the Alerts we want to count
     *   }
     * })
    **/
    count<T extends AlertCountArgs>(
      args?: Subset<T, AlertCountArgs>,
    ): Prisma.PrismaPromise<
      T extends $Utils.Record<'select', any>
        ? T['select'] extends true
          ? number
          : GetScalarType<T['select'], AlertCountAggregateOutputType>
        : number
    >

    /**
     * Allows you to perform aggregations operations on a Alert.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {AlertAggregateArgs} args - Select which aggregations you would like to apply and on what fields.
     * @example
     * // Ordered by age ascending
     * // Where email contains prisma.io
     * // Limited to the 10 users
     * const aggregations = await prisma.user.aggregate({
     *   _avg: {
     *     age: true,
     *   },
     *   where: {
     *     email: {
     *       contains: "prisma.io",
     *     },
     *   },
     *   orderBy: {
     *     age: "asc",
     *   },
     *   take: 10,
     * })
    **/
    aggregate<T extends AlertAggregateArgs>(args: Subset<T, AlertAggregateArgs>): Prisma.PrismaPromise<GetAlertAggregateType<T>>

    /**
     * Group by Alert.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {AlertGroupByArgs} args - Group by arguments.
     * @example
     * // Group by city, order by createdAt, get count
     * const result = await prisma.user.groupBy({
     *   by: ['city', 'createdAt'],
     *   orderBy: {
     *     createdAt: true
     *   },
     *   _count: {
     *     _all: true
     *   },
     * })
     * 
    **/
    groupBy<
      T extends AlertGroupByArgs,
      HasSelectOrTake extends Or<
        Extends<'skip', Keys<T>>,
        Extends<'take', Keys<T>>
      >,
      OrderByArg extends True extends HasSelectOrTake
        ? { orderBy: AlertGroupByArgs['orderBy'] }
        : { orderBy?: AlertGroupByArgs['orderBy'] },
      OrderFields extends ExcludeUnderscoreKeys<Keys<MaybeTupleToUnion<T['orderBy']>>>,
      ByFields extends MaybeTupleToUnion<T['by']>,
      ByValid extends Has<ByFields, OrderFields>,
      HavingFields extends GetHavingFields<T['having']>,
      HavingValid extends Has<ByFields, HavingFields>,
      ByEmpty extends T['by'] extends never[] ? True : False,
      InputErrors extends ByEmpty extends True
      ? `Error: "by" must not be empty.`
      : HavingValid extends False
      ? {
          [P in HavingFields]: P extends ByFields
            ? never
            : P extends string
            ? `Error: Field "${P}" used in "having" needs to be provided in "by".`
            : [
                Error,
                'Field ',
                P,
                ` in "having" needs to be provided in "by"`,
              ]
        }[HavingFields]
      : 'take' extends Keys<T>
      ? 'orderBy' extends Keys<T>
        ? ByValid extends True
          ? {}
          : {
              [P in OrderFields]: P extends ByFields
                ? never
                : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
            }[OrderFields]
        : 'Error: If you provide "take", you also need to provide "orderBy"'
      : 'skip' extends Keys<T>
      ? 'orderBy' extends Keys<T>
        ? ByValid extends True
          ? {}
          : {
              [P in OrderFields]: P extends ByFields
                ? never
                : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
            }[OrderFields]
        : 'Error: If you provide "skip", you also need to provide "orderBy"'
      : ByValid extends True
      ? {}
      : {
          [P in OrderFields]: P extends ByFields
            ? never
            : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
        }[OrderFields]
    >(args: SubsetIntersection<T, AlertGroupByArgs, OrderByArg> & InputErrors): {} extends InputErrors ? GetAlertGroupByPayload<T> : Prisma.PrismaPromise<InputErrors>
  /**
   * Fields of the Alert model
   */
  readonly fields: AlertFieldRefs;
  }

  /**
   * The delegate class that acts as a "Promise-like" for Alert.
   * Why is this prefixed with `Prisma__`?
   * Because we want to prevent naming conflicts as mentioned in
   * https://github.com/prisma/prisma-client-js/issues/707
   */
  export interface Prisma__AlertClient<T, Null = never, ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs, GlobalOmitOptions = {}> extends Prisma.PrismaPromise<T> {
    readonly [Symbol.toStringTag]: "PrismaPromise"
    crisis<T extends CrisisDefaultArgs<ExtArgs> = {}>(args?: Subset<T, CrisisDefaultArgs<ExtArgs>>): Prisma__CrisisClient<$Result.GetResult<Prisma.$CrisisPayload<ExtArgs>, T, "findUniqueOrThrow", GlobalOmitOptions> | Null, Null, ExtArgs, GlobalOmitOptions>
    /**
     * Attaches callbacks for the resolution and/or rejection of the Promise.
     * @param onfulfilled The callback to execute when the Promise is resolved.
     * @param onrejected The callback to execute when the Promise is rejected.
     * @returns A Promise for the completion of which ever callback is executed.
     */
    then<TResult1 = T, TResult2 = never>(onfulfilled?: ((value: T) => TResult1 | PromiseLike<TResult1>) | undefined | null, onrejected?: ((reason: any) => TResult2 | PromiseLike<TResult2>) | undefined | null): $Utils.JsPromise<TResult1 | TResult2>
    /**
     * Attaches a callback for only the rejection of the Promise.
     * @param onrejected The callback to execute when the Promise is rejected.
     * @returns A Promise for the completion of the callback.
     */
    catch<TResult = never>(onrejected?: ((reason: any) => TResult | PromiseLike<TResult>) | undefined | null): $Utils.JsPromise<T | TResult>
    /**
     * Attaches a callback that is invoked when the Promise is settled (fulfilled or rejected). The
     * resolved value cannot be modified from the callback.
     * @param onfinally The callback to execute when the Promise is settled (fulfilled or rejected).
     * @returns A Promise for the completion of the callback.
     */
    finally(onfinally?: (() => void) | undefined | null): $Utils.JsPromise<T>
  }




  /**
   * Fields of the Alert model
   */
  interface AlertFieldRefs {
    readonly id: FieldRef<"Alert", 'String'>
    readonly crisisId: FieldRef<"Alert", 'String'>
    readonly type: FieldRef<"Alert", 'AlertType'>
    readonly severity: FieldRef<"Alert", 'AlertSeverity'>
    readonly message: FieldRef<"Alert", 'String'>
    readonly isActive: FieldRef<"Alert", 'Boolean'>
    readonly triggeredAt: FieldRef<"Alert", 'DateTime'>
    readonly resolvedAt: FieldRef<"Alert", 'DateTime'>
  }
    

  // Custom InputTypes
  /**
   * Alert findUnique
   */
  export type AlertFindUniqueArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Alert
     */
    select?: AlertSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Alert
     */
    omit?: AlertOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: AlertInclude<ExtArgs> | null
    /**
     * Filter, which Alert to fetch.
     */
    where: AlertWhereUniqueInput
  }

  /**
   * Alert findUniqueOrThrow
   */
  export type AlertFindUniqueOrThrowArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Alert
     */
    select?: AlertSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Alert
     */
    omit?: AlertOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: AlertInclude<ExtArgs> | null
    /**
     * Filter, which Alert to fetch.
     */
    where: AlertWhereUniqueInput
  }

  /**
   * Alert findFirst
   */
  export type AlertFindFirstArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Alert
     */
    select?: AlertSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Alert
     */
    omit?: AlertOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: AlertInclude<ExtArgs> | null
    /**
     * Filter, which Alert to fetch.
     */
    where?: AlertWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of Alerts to fetch.
     */
    orderBy?: AlertOrderByWithRelationInput | AlertOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for searching for Alerts.
     */
    cursor?: AlertWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` Alerts from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` Alerts.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/distinct Distinct Docs}
     * 
     * Filter by unique combinations of Alerts.
     */
    distinct?: AlertScalarFieldEnum | AlertScalarFieldEnum[]
  }

  /**
   * Alert findFirstOrThrow
   */
  export type AlertFindFirstOrThrowArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Alert
     */
    select?: AlertSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Alert
     */
    omit?: AlertOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: AlertInclude<ExtArgs> | null
    /**
     * Filter, which Alert to fetch.
     */
    where?: AlertWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of Alerts to fetch.
     */
    orderBy?: AlertOrderByWithRelationInput | AlertOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for searching for Alerts.
     */
    cursor?: AlertWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` Alerts from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` Alerts.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/distinct Distinct Docs}
     * 
     * Filter by unique combinations of Alerts.
     */
    distinct?: AlertScalarFieldEnum | AlertScalarFieldEnum[]
  }

  /**
   * Alert findMany
   */
  export type AlertFindManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Alert
     */
    select?: AlertSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Alert
     */
    omit?: AlertOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: AlertInclude<ExtArgs> | null
    /**
     * Filter, which Alerts to fetch.
     */
    where?: AlertWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of Alerts to fetch.
     */
    orderBy?: AlertOrderByWithRelationInput | AlertOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for listing Alerts.
     */
    cursor?: AlertWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` Alerts from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` Alerts.
     */
    skip?: number
    distinct?: AlertScalarFieldEnum | AlertScalarFieldEnum[]
  }

  /**
   * Alert create
   */
  export type AlertCreateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Alert
     */
    select?: AlertSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Alert
     */
    omit?: AlertOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: AlertInclude<ExtArgs> | null
    /**
     * The data needed to create a Alert.
     */
    data: XOR<AlertCreateInput, AlertUncheckedCreateInput>
  }

  /**
   * Alert createMany
   */
  export type AlertCreateManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * The data used to create many Alerts.
     */
    data: AlertCreateManyInput | AlertCreateManyInput[]
    skipDuplicates?: boolean
  }

  /**
   * Alert createManyAndReturn
   */
  export type AlertCreateManyAndReturnArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Alert
     */
    select?: AlertSelectCreateManyAndReturn<ExtArgs> | null
    /**
     * Omit specific fields from the Alert
     */
    omit?: AlertOmit<ExtArgs> | null
    /**
     * The data used to create many Alerts.
     */
    data: AlertCreateManyInput | AlertCreateManyInput[]
    skipDuplicates?: boolean
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: AlertIncludeCreateManyAndReturn<ExtArgs> | null
  }

  /**
   * Alert update
   */
  export type AlertUpdateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Alert
     */
    select?: AlertSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Alert
     */
    omit?: AlertOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: AlertInclude<ExtArgs> | null
    /**
     * The data needed to update a Alert.
     */
    data: XOR<AlertUpdateInput, AlertUncheckedUpdateInput>
    /**
     * Choose, which Alert to update.
     */
    where: AlertWhereUniqueInput
  }

  /**
   * Alert updateMany
   */
  export type AlertUpdateManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * The data used to update Alerts.
     */
    data: XOR<AlertUpdateManyMutationInput, AlertUncheckedUpdateManyInput>
    /**
     * Filter which Alerts to update
     */
    where?: AlertWhereInput
    /**
     * Limit how many Alerts to update.
     */
    limit?: number
  }

  /**
   * Alert updateManyAndReturn
   */
  export type AlertUpdateManyAndReturnArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Alert
     */
    select?: AlertSelectUpdateManyAndReturn<ExtArgs> | null
    /**
     * Omit specific fields from the Alert
     */
    omit?: AlertOmit<ExtArgs> | null
    /**
     * The data used to update Alerts.
     */
    data: XOR<AlertUpdateManyMutationInput, AlertUncheckedUpdateManyInput>
    /**
     * Filter which Alerts to update
     */
    where?: AlertWhereInput
    /**
     * Limit how many Alerts to update.
     */
    limit?: number
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: AlertIncludeUpdateManyAndReturn<ExtArgs> | null
  }

  /**
   * Alert upsert
   */
  export type AlertUpsertArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Alert
     */
    select?: AlertSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Alert
     */
    omit?: AlertOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: AlertInclude<ExtArgs> | null
    /**
     * The filter to search for the Alert to update in case it exists.
     */
    where: AlertWhereUniqueInput
    /**
     * In case the Alert found by the `where` argument doesn't exist, create a new Alert with this data.
     */
    create: XOR<AlertCreateInput, AlertUncheckedCreateInput>
    /**
     * In case the Alert was found with the provided `where` argument, update it with this data.
     */
    update: XOR<AlertUpdateInput, AlertUncheckedUpdateInput>
  }

  /**
   * Alert delete
   */
  export type AlertDeleteArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Alert
     */
    select?: AlertSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Alert
     */
    omit?: AlertOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: AlertInclude<ExtArgs> | null
    /**
     * Filter which Alert to delete.
     */
    where: AlertWhereUniqueInput
  }

  /**
   * Alert deleteMany
   */
  export type AlertDeleteManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Filter which Alerts to delete
     */
    where?: AlertWhereInput
    /**
     * Limit how many Alerts to delete.
     */
    limit?: number
  }

  /**
   * Alert without action
   */
  export type AlertDefaultArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Alert
     */
    select?: AlertSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Alert
     */
    omit?: AlertOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: AlertInclude<ExtArgs> | null
  }


  /**
   * Model AuditDecision
   */

  export type AggregateAuditDecision = {
    _count: AuditDecisionCountAggregateOutputType | null
    _avg: AuditDecisionAvgAggregateOutputType | null
    _sum: AuditDecisionSumAggregateOutputType | null
    _min: AuditDecisionMinAggregateOutputType | null
    _max: AuditDecisionMaxAggregateOutputType | null
  }

  export type AuditDecisionAvgAggregateOutputType = {
    locationLat: number | null
    locationLng: number | null
  }

  export type AuditDecisionSumAggregateOutputType = {
    locationLat: number | null
    locationLng: number | null
  }

  export type AuditDecisionMinAggregateOutputType = {
    id: string | null
    title: string | null
    type: $Enums.AuditDecisionType | null
    decisionMade: string | null
    rationale: string | null
    riskLevel: $Enums.RiskLevel | null
    alternatives: string | null
    locationLat: number | null
    locationLng: number | null
    locationAddress: string | null
    deviceId: string | null
    status: $Enums.AuditStatus | null
    syncStatus: $Enums.SyncStatus | null
    priority: $Enums.Priority | null
    cryptoHash: string | null
    createdById: string | null
    createdAt: Date | null
    updatedAt: Date | null
  }

  export type AuditDecisionMaxAggregateOutputType = {
    id: string | null
    title: string | null
    type: $Enums.AuditDecisionType | null
    decisionMade: string | null
    rationale: string | null
    riskLevel: $Enums.RiskLevel | null
    alternatives: string | null
    locationLat: number | null
    locationLng: number | null
    locationAddress: string | null
    deviceId: string | null
    status: $Enums.AuditStatus | null
    syncStatus: $Enums.SyncStatus | null
    priority: $Enums.Priority | null
    cryptoHash: string | null
    createdById: string | null
    createdAt: Date | null
    updatedAt: Date | null
  }

  export type AuditDecisionCountAggregateOutputType = {
    id: number
    title: number
    type: number
    decisionMade: number
    rationale: number
    riskLevel: number
    informationSources: number
    stakeholders: number
    alternatives: number
    locationLat: number
    locationLng: number
    locationAddress: number
    deviceId: number
    status: number
    syncStatus: number
    tags: number
    priority: number
    cryptoHash: number
    createdById: number
    createdAt: number
    updatedAt: number
    _all: number
  }


  export type AuditDecisionAvgAggregateInputType = {
    locationLat?: true
    locationLng?: true
  }

  export type AuditDecisionSumAggregateInputType = {
    locationLat?: true
    locationLng?: true
  }

  export type AuditDecisionMinAggregateInputType = {
    id?: true
    title?: true
    type?: true
    decisionMade?: true
    rationale?: true
    riskLevel?: true
    alternatives?: true
    locationLat?: true
    locationLng?: true
    locationAddress?: true
    deviceId?: true
    status?: true
    syncStatus?: true
    priority?: true
    cryptoHash?: true
    createdById?: true
    createdAt?: true
    updatedAt?: true
  }

  export type AuditDecisionMaxAggregateInputType = {
    id?: true
    title?: true
    type?: true
    decisionMade?: true
    rationale?: true
    riskLevel?: true
    alternatives?: true
    locationLat?: true
    locationLng?: true
    locationAddress?: true
    deviceId?: true
    status?: true
    syncStatus?: true
    priority?: true
    cryptoHash?: true
    createdById?: true
    createdAt?: true
    updatedAt?: true
  }

  export type AuditDecisionCountAggregateInputType = {
    id?: true
    title?: true
    type?: true
    decisionMade?: true
    rationale?: true
    riskLevel?: true
    informationSources?: true
    stakeholders?: true
    alternatives?: true
    locationLat?: true
    locationLng?: true
    locationAddress?: true
    deviceId?: true
    status?: true
    syncStatus?: true
    tags?: true
    priority?: true
    cryptoHash?: true
    createdById?: true
    createdAt?: true
    updatedAt?: true
    _all?: true
  }

  export type AuditDecisionAggregateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Filter which AuditDecision to aggregate.
     */
    where?: AuditDecisionWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of AuditDecisions to fetch.
     */
    orderBy?: AuditDecisionOrderByWithRelationInput | AuditDecisionOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the start position
     */
    cursor?: AuditDecisionWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` AuditDecisions from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` AuditDecisions.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Count returned AuditDecisions
    **/
    _count?: true | AuditDecisionCountAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to average
    **/
    _avg?: AuditDecisionAvgAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to sum
    **/
    _sum?: AuditDecisionSumAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to find the minimum value
    **/
    _min?: AuditDecisionMinAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to find the maximum value
    **/
    _max?: AuditDecisionMaxAggregateInputType
  }

  export type GetAuditDecisionAggregateType<T extends AuditDecisionAggregateArgs> = {
        [P in keyof T & keyof AggregateAuditDecision]: P extends '_count' | 'count'
      ? T[P] extends true
        ? number
        : GetScalarType<T[P], AggregateAuditDecision[P]>
      : GetScalarType<T[P], AggregateAuditDecision[P]>
  }




  export type AuditDecisionGroupByArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    where?: AuditDecisionWhereInput
    orderBy?: AuditDecisionOrderByWithAggregationInput | AuditDecisionOrderByWithAggregationInput[]
    by: AuditDecisionScalarFieldEnum[] | AuditDecisionScalarFieldEnum
    having?: AuditDecisionScalarWhereWithAggregatesInput
    take?: number
    skip?: number
    _count?: AuditDecisionCountAggregateInputType | true
    _avg?: AuditDecisionAvgAggregateInputType
    _sum?: AuditDecisionSumAggregateInputType
    _min?: AuditDecisionMinAggregateInputType
    _max?: AuditDecisionMaxAggregateInputType
  }

  export type AuditDecisionGroupByOutputType = {
    id: string
    title: string
    type: $Enums.AuditDecisionType
    decisionMade: string
    rationale: string
    riskLevel: $Enums.RiskLevel
    informationSources: JsonValue
    stakeholders: JsonValue
    alternatives: string | null
    locationLat: number | null
    locationLng: number | null
    locationAddress: string | null
    deviceId: string
    status: $Enums.AuditStatus
    syncStatus: $Enums.SyncStatus
    tags: JsonValue
    priority: $Enums.Priority
    cryptoHash: string | null
    createdById: string
    createdAt: Date
    updatedAt: Date
    _count: AuditDecisionCountAggregateOutputType | null
    _avg: AuditDecisionAvgAggregateOutputType | null
    _sum: AuditDecisionSumAggregateOutputType | null
    _min: AuditDecisionMinAggregateOutputType | null
    _max: AuditDecisionMaxAggregateOutputType | null
  }

  type GetAuditDecisionGroupByPayload<T extends AuditDecisionGroupByArgs> = Prisma.PrismaPromise<
    Array<
      PickEnumerable<AuditDecisionGroupByOutputType, T['by']> &
        {
          [P in ((keyof T) & (keyof AuditDecisionGroupByOutputType))]: P extends '_count'
            ? T[P] extends boolean
              ? number
              : GetScalarType<T[P], AuditDecisionGroupByOutputType[P]>
            : GetScalarType<T[P], AuditDecisionGroupByOutputType[P]>
        }
      >
    >


  export type AuditDecisionSelect<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetSelect<{
    id?: boolean
    title?: boolean
    type?: boolean
    decisionMade?: boolean
    rationale?: boolean
    riskLevel?: boolean
    informationSources?: boolean
    stakeholders?: boolean
    alternatives?: boolean
    locationLat?: boolean
    locationLng?: boolean
    locationAddress?: boolean
    deviceId?: boolean
    status?: boolean
    syncStatus?: boolean
    tags?: boolean
    priority?: boolean
    cryptoHash?: boolean
    createdById?: boolean
    createdAt?: boolean
    updatedAt?: boolean
    createdBy?: boolean | UserDefaultArgs<ExtArgs>
    evidence?: boolean | AuditDecision$evidenceArgs<ExtArgs>
    _count?: boolean | AuditDecisionCountOutputTypeDefaultArgs<ExtArgs>
  }, ExtArgs["result"]["auditDecision"]>

  export type AuditDecisionSelectCreateManyAndReturn<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetSelect<{
    id?: boolean
    title?: boolean
    type?: boolean
    decisionMade?: boolean
    rationale?: boolean
    riskLevel?: boolean
    informationSources?: boolean
    stakeholders?: boolean
    alternatives?: boolean
    locationLat?: boolean
    locationLng?: boolean
    locationAddress?: boolean
    deviceId?: boolean
    status?: boolean
    syncStatus?: boolean
    tags?: boolean
    priority?: boolean
    cryptoHash?: boolean
    createdById?: boolean
    createdAt?: boolean
    updatedAt?: boolean
    createdBy?: boolean | UserDefaultArgs<ExtArgs>
  }, ExtArgs["result"]["auditDecision"]>

  export type AuditDecisionSelectUpdateManyAndReturn<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetSelect<{
    id?: boolean
    title?: boolean
    type?: boolean
    decisionMade?: boolean
    rationale?: boolean
    riskLevel?: boolean
    informationSources?: boolean
    stakeholders?: boolean
    alternatives?: boolean
    locationLat?: boolean
    locationLng?: boolean
    locationAddress?: boolean
    deviceId?: boolean
    status?: boolean
    syncStatus?: boolean
    tags?: boolean
    priority?: boolean
    cryptoHash?: boolean
    createdById?: boolean
    createdAt?: boolean
    updatedAt?: boolean
    createdBy?: boolean | UserDefaultArgs<ExtArgs>
  }, ExtArgs["result"]["auditDecision"]>

  export type AuditDecisionSelectScalar = {
    id?: boolean
    title?: boolean
    type?: boolean
    decisionMade?: boolean
    rationale?: boolean
    riskLevel?: boolean
    informationSources?: boolean
    stakeholders?: boolean
    alternatives?: boolean
    locationLat?: boolean
    locationLng?: boolean
    locationAddress?: boolean
    deviceId?: boolean
    status?: boolean
    syncStatus?: boolean
    tags?: boolean
    priority?: boolean
    cryptoHash?: boolean
    createdById?: boolean
    createdAt?: boolean
    updatedAt?: boolean
  }

  export type AuditDecisionOmit<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetOmit<"id" | "title" | "type" | "decisionMade" | "rationale" | "riskLevel" | "informationSources" | "stakeholders" | "alternatives" | "locationLat" | "locationLng" | "locationAddress" | "deviceId" | "status" | "syncStatus" | "tags" | "priority" | "cryptoHash" | "createdById" | "createdAt" | "updatedAt", ExtArgs["result"]["auditDecision"]>
  export type AuditDecisionInclude<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    createdBy?: boolean | UserDefaultArgs<ExtArgs>
    evidence?: boolean | AuditDecision$evidenceArgs<ExtArgs>
    _count?: boolean | AuditDecisionCountOutputTypeDefaultArgs<ExtArgs>
  }
  export type AuditDecisionIncludeCreateManyAndReturn<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    createdBy?: boolean | UserDefaultArgs<ExtArgs>
  }
  export type AuditDecisionIncludeUpdateManyAndReturn<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    createdBy?: boolean | UserDefaultArgs<ExtArgs>
  }

  export type $AuditDecisionPayload<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    name: "AuditDecision"
    objects: {
      createdBy: Prisma.$UserPayload<ExtArgs>
      evidence: Prisma.$EvidencePayload<ExtArgs>[]
    }
    scalars: $Extensions.GetPayloadResult<{
      id: string
      title: string
      type: $Enums.AuditDecisionType
      decisionMade: string
      rationale: string
      riskLevel: $Enums.RiskLevel
      informationSources: Prisma.JsonValue
      stakeholders: Prisma.JsonValue
      alternatives: string | null
      locationLat: number | null
      locationLng: number | null
      locationAddress: string | null
      deviceId: string
      status: $Enums.AuditStatus
      syncStatus: $Enums.SyncStatus
      tags: Prisma.JsonValue
      priority: $Enums.Priority
      cryptoHash: string | null
      createdById: string
      createdAt: Date
      updatedAt: Date
    }, ExtArgs["result"]["auditDecision"]>
    composites: {}
  }

  type AuditDecisionGetPayload<S extends boolean | null | undefined | AuditDecisionDefaultArgs> = $Result.GetResult<Prisma.$AuditDecisionPayload, S>

  type AuditDecisionCountArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> =
    Omit<AuditDecisionFindManyArgs, 'select' | 'include' | 'distinct' | 'omit'> & {
      select?: AuditDecisionCountAggregateInputType | true
    }

  export interface AuditDecisionDelegate<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs, GlobalOmitOptions = {}> {
    [K: symbol]: { types: Prisma.TypeMap<ExtArgs>['model']['AuditDecision'], meta: { name: 'AuditDecision' } }
    /**
     * Find zero or one AuditDecision that matches the filter.
     * @param {AuditDecisionFindUniqueArgs} args - Arguments to find a AuditDecision
     * @example
     * // Get one AuditDecision
     * const auditDecision = await prisma.auditDecision.findUnique({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findUnique<T extends AuditDecisionFindUniqueArgs>(args: SelectSubset<T, AuditDecisionFindUniqueArgs<ExtArgs>>): Prisma__AuditDecisionClient<$Result.GetResult<Prisma.$AuditDecisionPayload<ExtArgs>, T, "findUnique", GlobalOmitOptions> | null, null, ExtArgs, GlobalOmitOptions>

    /**
     * Find one AuditDecision that matches the filter or throw an error with `error.code='P2025'`
     * if no matches were found.
     * @param {AuditDecisionFindUniqueOrThrowArgs} args - Arguments to find a AuditDecision
     * @example
     * // Get one AuditDecision
     * const auditDecision = await prisma.auditDecision.findUniqueOrThrow({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findUniqueOrThrow<T extends AuditDecisionFindUniqueOrThrowArgs>(args: SelectSubset<T, AuditDecisionFindUniqueOrThrowArgs<ExtArgs>>): Prisma__AuditDecisionClient<$Result.GetResult<Prisma.$AuditDecisionPayload<ExtArgs>, T, "findUniqueOrThrow", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Find the first AuditDecision that matches the filter.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {AuditDecisionFindFirstArgs} args - Arguments to find a AuditDecision
     * @example
     * // Get one AuditDecision
     * const auditDecision = await prisma.auditDecision.findFirst({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findFirst<T extends AuditDecisionFindFirstArgs>(args?: SelectSubset<T, AuditDecisionFindFirstArgs<ExtArgs>>): Prisma__AuditDecisionClient<$Result.GetResult<Prisma.$AuditDecisionPayload<ExtArgs>, T, "findFirst", GlobalOmitOptions> | null, null, ExtArgs, GlobalOmitOptions>

    /**
     * Find the first AuditDecision that matches the filter or
     * throw `PrismaKnownClientError` with `P2025` code if no matches were found.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {AuditDecisionFindFirstOrThrowArgs} args - Arguments to find a AuditDecision
     * @example
     * // Get one AuditDecision
     * const auditDecision = await prisma.auditDecision.findFirstOrThrow({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findFirstOrThrow<T extends AuditDecisionFindFirstOrThrowArgs>(args?: SelectSubset<T, AuditDecisionFindFirstOrThrowArgs<ExtArgs>>): Prisma__AuditDecisionClient<$Result.GetResult<Prisma.$AuditDecisionPayload<ExtArgs>, T, "findFirstOrThrow", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Find zero or more AuditDecisions that matches the filter.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {AuditDecisionFindManyArgs} args - Arguments to filter and select certain fields only.
     * @example
     * // Get all AuditDecisions
     * const auditDecisions = await prisma.auditDecision.findMany()
     * 
     * // Get first 10 AuditDecisions
     * const auditDecisions = await prisma.auditDecision.findMany({ take: 10 })
     * 
     * // Only select the `id`
     * const auditDecisionWithIdOnly = await prisma.auditDecision.findMany({ select: { id: true } })
     * 
     */
    findMany<T extends AuditDecisionFindManyArgs>(args?: SelectSubset<T, AuditDecisionFindManyArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$AuditDecisionPayload<ExtArgs>, T, "findMany", GlobalOmitOptions>>

    /**
     * Create a AuditDecision.
     * @param {AuditDecisionCreateArgs} args - Arguments to create a AuditDecision.
     * @example
     * // Create one AuditDecision
     * const AuditDecision = await prisma.auditDecision.create({
     *   data: {
     *     // ... data to create a AuditDecision
     *   }
     * })
     * 
     */
    create<T extends AuditDecisionCreateArgs>(args: SelectSubset<T, AuditDecisionCreateArgs<ExtArgs>>): Prisma__AuditDecisionClient<$Result.GetResult<Prisma.$AuditDecisionPayload<ExtArgs>, T, "create", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Create many AuditDecisions.
     * @param {AuditDecisionCreateManyArgs} args - Arguments to create many AuditDecisions.
     * @example
     * // Create many AuditDecisions
     * const auditDecision = await prisma.auditDecision.createMany({
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     *     
     */
    createMany<T extends AuditDecisionCreateManyArgs>(args?: SelectSubset<T, AuditDecisionCreateManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Create many AuditDecisions and returns the data saved in the database.
     * @param {AuditDecisionCreateManyAndReturnArgs} args - Arguments to create many AuditDecisions.
     * @example
     * // Create many AuditDecisions
     * const auditDecision = await prisma.auditDecision.createManyAndReturn({
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * 
     * // Create many AuditDecisions and only return the `id`
     * const auditDecisionWithIdOnly = await prisma.auditDecision.createManyAndReturn({
     *   select: { id: true },
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * 
     */
    createManyAndReturn<T extends AuditDecisionCreateManyAndReturnArgs>(args?: SelectSubset<T, AuditDecisionCreateManyAndReturnArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$AuditDecisionPayload<ExtArgs>, T, "createManyAndReturn", GlobalOmitOptions>>

    /**
     * Delete a AuditDecision.
     * @param {AuditDecisionDeleteArgs} args - Arguments to delete one AuditDecision.
     * @example
     * // Delete one AuditDecision
     * const AuditDecision = await prisma.auditDecision.delete({
     *   where: {
     *     // ... filter to delete one AuditDecision
     *   }
     * })
     * 
     */
    delete<T extends AuditDecisionDeleteArgs>(args: SelectSubset<T, AuditDecisionDeleteArgs<ExtArgs>>): Prisma__AuditDecisionClient<$Result.GetResult<Prisma.$AuditDecisionPayload<ExtArgs>, T, "delete", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Update one AuditDecision.
     * @param {AuditDecisionUpdateArgs} args - Arguments to update one AuditDecision.
     * @example
     * // Update one AuditDecision
     * const auditDecision = await prisma.auditDecision.update({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: {
     *     // ... provide data here
     *   }
     * })
     * 
     */
    update<T extends AuditDecisionUpdateArgs>(args: SelectSubset<T, AuditDecisionUpdateArgs<ExtArgs>>): Prisma__AuditDecisionClient<$Result.GetResult<Prisma.$AuditDecisionPayload<ExtArgs>, T, "update", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Delete zero or more AuditDecisions.
     * @param {AuditDecisionDeleteManyArgs} args - Arguments to filter AuditDecisions to delete.
     * @example
     * // Delete a few AuditDecisions
     * const { count } = await prisma.auditDecision.deleteMany({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     * 
     */
    deleteMany<T extends AuditDecisionDeleteManyArgs>(args?: SelectSubset<T, AuditDecisionDeleteManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Update zero or more AuditDecisions.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {AuditDecisionUpdateManyArgs} args - Arguments to update one or more rows.
     * @example
     * // Update many AuditDecisions
     * const auditDecision = await prisma.auditDecision.updateMany({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: {
     *     // ... provide data here
     *   }
     * })
     * 
     */
    updateMany<T extends AuditDecisionUpdateManyArgs>(args: SelectSubset<T, AuditDecisionUpdateManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Update zero or more AuditDecisions and returns the data updated in the database.
     * @param {AuditDecisionUpdateManyAndReturnArgs} args - Arguments to update many AuditDecisions.
     * @example
     * // Update many AuditDecisions
     * const auditDecision = await prisma.auditDecision.updateManyAndReturn({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * 
     * // Update zero or more AuditDecisions and only return the `id`
     * const auditDecisionWithIdOnly = await prisma.auditDecision.updateManyAndReturn({
     *   select: { id: true },
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * 
     */
    updateManyAndReturn<T extends AuditDecisionUpdateManyAndReturnArgs>(args: SelectSubset<T, AuditDecisionUpdateManyAndReturnArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$AuditDecisionPayload<ExtArgs>, T, "updateManyAndReturn", GlobalOmitOptions>>

    /**
     * Create or update one AuditDecision.
     * @param {AuditDecisionUpsertArgs} args - Arguments to update or create a AuditDecision.
     * @example
     * // Update or create a AuditDecision
     * const auditDecision = await prisma.auditDecision.upsert({
     *   create: {
     *     // ... data to create a AuditDecision
     *   },
     *   update: {
     *     // ... in case it already exists, update
     *   },
     *   where: {
     *     // ... the filter for the AuditDecision we want to update
     *   }
     * })
     */
    upsert<T extends AuditDecisionUpsertArgs>(args: SelectSubset<T, AuditDecisionUpsertArgs<ExtArgs>>): Prisma__AuditDecisionClient<$Result.GetResult<Prisma.$AuditDecisionPayload<ExtArgs>, T, "upsert", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>


    /**
     * Count the number of AuditDecisions.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {AuditDecisionCountArgs} args - Arguments to filter AuditDecisions to count.
     * @example
     * // Count the number of AuditDecisions
     * const count = await prisma.auditDecision.count({
     *   where: {
     *     // ... the filter for the AuditDecisions we want to count
     *   }
     * })
    **/
    count<T extends AuditDecisionCountArgs>(
      args?: Subset<T, AuditDecisionCountArgs>,
    ): Prisma.PrismaPromise<
      T extends $Utils.Record<'select', any>
        ? T['select'] extends true
          ? number
          : GetScalarType<T['select'], AuditDecisionCountAggregateOutputType>
        : number
    >

    /**
     * Allows you to perform aggregations operations on a AuditDecision.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {AuditDecisionAggregateArgs} args - Select which aggregations you would like to apply and on what fields.
     * @example
     * // Ordered by age ascending
     * // Where email contains prisma.io
     * // Limited to the 10 users
     * const aggregations = await prisma.user.aggregate({
     *   _avg: {
     *     age: true,
     *   },
     *   where: {
     *     email: {
     *       contains: "prisma.io",
     *     },
     *   },
     *   orderBy: {
     *     age: "asc",
     *   },
     *   take: 10,
     * })
    **/
    aggregate<T extends AuditDecisionAggregateArgs>(args: Subset<T, AuditDecisionAggregateArgs>): Prisma.PrismaPromise<GetAuditDecisionAggregateType<T>>

    /**
     * Group by AuditDecision.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {AuditDecisionGroupByArgs} args - Group by arguments.
     * @example
     * // Group by city, order by createdAt, get count
     * const result = await prisma.user.groupBy({
     *   by: ['city', 'createdAt'],
     *   orderBy: {
     *     createdAt: true
     *   },
     *   _count: {
     *     _all: true
     *   },
     * })
     * 
    **/
    groupBy<
      T extends AuditDecisionGroupByArgs,
      HasSelectOrTake extends Or<
        Extends<'skip', Keys<T>>,
        Extends<'take', Keys<T>>
      >,
      OrderByArg extends True extends HasSelectOrTake
        ? { orderBy: AuditDecisionGroupByArgs['orderBy'] }
        : { orderBy?: AuditDecisionGroupByArgs['orderBy'] },
      OrderFields extends ExcludeUnderscoreKeys<Keys<MaybeTupleToUnion<T['orderBy']>>>,
      ByFields extends MaybeTupleToUnion<T['by']>,
      ByValid extends Has<ByFields, OrderFields>,
      HavingFields extends GetHavingFields<T['having']>,
      HavingValid extends Has<ByFields, HavingFields>,
      ByEmpty extends T['by'] extends never[] ? True : False,
      InputErrors extends ByEmpty extends True
      ? `Error: "by" must not be empty.`
      : HavingValid extends False
      ? {
          [P in HavingFields]: P extends ByFields
            ? never
            : P extends string
            ? `Error: Field "${P}" used in "having" needs to be provided in "by".`
            : [
                Error,
                'Field ',
                P,
                ` in "having" needs to be provided in "by"`,
              ]
        }[HavingFields]
      : 'take' extends Keys<T>
      ? 'orderBy' extends Keys<T>
        ? ByValid extends True
          ? {}
          : {
              [P in OrderFields]: P extends ByFields
                ? never
                : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
            }[OrderFields]
        : 'Error: If you provide "take", you also need to provide "orderBy"'
      : 'skip' extends Keys<T>
      ? 'orderBy' extends Keys<T>
        ? ByValid extends True
          ? {}
          : {
              [P in OrderFields]: P extends ByFields
                ? never
                : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
            }[OrderFields]
        : 'Error: If you provide "skip", you also need to provide "orderBy"'
      : ByValid extends True
      ? {}
      : {
          [P in OrderFields]: P extends ByFields
            ? never
            : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
        }[OrderFields]
    >(args: SubsetIntersection<T, AuditDecisionGroupByArgs, OrderByArg> & InputErrors): {} extends InputErrors ? GetAuditDecisionGroupByPayload<T> : Prisma.PrismaPromise<InputErrors>
  /**
   * Fields of the AuditDecision model
   */
  readonly fields: AuditDecisionFieldRefs;
  }

  /**
   * The delegate class that acts as a "Promise-like" for AuditDecision.
   * Why is this prefixed with `Prisma__`?
   * Because we want to prevent naming conflicts as mentioned in
   * https://github.com/prisma/prisma-client-js/issues/707
   */
  export interface Prisma__AuditDecisionClient<T, Null = never, ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs, GlobalOmitOptions = {}> extends Prisma.PrismaPromise<T> {
    readonly [Symbol.toStringTag]: "PrismaPromise"
    createdBy<T extends UserDefaultArgs<ExtArgs> = {}>(args?: Subset<T, UserDefaultArgs<ExtArgs>>): Prisma__UserClient<$Result.GetResult<Prisma.$UserPayload<ExtArgs>, T, "findUniqueOrThrow", GlobalOmitOptions> | Null, Null, ExtArgs, GlobalOmitOptions>
    evidence<T extends AuditDecision$evidenceArgs<ExtArgs> = {}>(args?: Subset<T, AuditDecision$evidenceArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$EvidencePayload<ExtArgs>, T, "findMany", GlobalOmitOptions> | Null>
    /**
     * Attaches callbacks for the resolution and/or rejection of the Promise.
     * @param onfulfilled The callback to execute when the Promise is resolved.
     * @param onrejected The callback to execute when the Promise is rejected.
     * @returns A Promise for the completion of which ever callback is executed.
     */
    then<TResult1 = T, TResult2 = never>(onfulfilled?: ((value: T) => TResult1 | PromiseLike<TResult1>) | undefined | null, onrejected?: ((reason: any) => TResult2 | PromiseLike<TResult2>) | undefined | null): $Utils.JsPromise<TResult1 | TResult2>
    /**
     * Attaches a callback for only the rejection of the Promise.
     * @param onrejected The callback to execute when the Promise is rejected.
     * @returns A Promise for the completion of the callback.
     */
    catch<TResult = never>(onrejected?: ((reason: any) => TResult | PromiseLike<TResult>) | undefined | null): $Utils.JsPromise<T | TResult>
    /**
     * Attaches a callback that is invoked when the Promise is settled (fulfilled or rejected). The
     * resolved value cannot be modified from the callback.
     * @param onfinally The callback to execute when the Promise is settled (fulfilled or rejected).
     * @returns A Promise for the completion of the callback.
     */
    finally(onfinally?: (() => void) | undefined | null): $Utils.JsPromise<T>
  }




  /**
   * Fields of the AuditDecision model
   */
  interface AuditDecisionFieldRefs {
    readonly id: FieldRef<"AuditDecision", 'String'>
    readonly title: FieldRef<"AuditDecision", 'String'>
    readonly type: FieldRef<"AuditDecision", 'AuditDecisionType'>
    readonly decisionMade: FieldRef<"AuditDecision", 'String'>
    readonly rationale: FieldRef<"AuditDecision", 'String'>
    readonly riskLevel: FieldRef<"AuditDecision", 'RiskLevel'>
    readonly informationSources: FieldRef<"AuditDecision", 'Json'>
    readonly stakeholders: FieldRef<"AuditDecision", 'Json'>
    readonly alternatives: FieldRef<"AuditDecision", 'String'>
    readonly locationLat: FieldRef<"AuditDecision", 'Float'>
    readonly locationLng: FieldRef<"AuditDecision", 'Float'>
    readonly locationAddress: FieldRef<"AuditDecision", 'String'>
    readonly deviceId: FieldRef<"AuditDecision", 'String'>
    readonly status: FieldRef<"AuditDecision", 'AuditStatus'>
    readonly syncStatus: FieldRef<"AuditDecision", 'SyncStatus'>
    readonly tags: FieldRef<"AuditDecision", 'Json'>
    readonly priority: FieldRef<"AuditDecision", 'Priority'>
    readonly cryptoHash: FieldRef<"AuditDecision", 'String'>
    readonly createdById: FieldRef<"AuditDecision", 'String'>
    readonly createdAt: FieldRef<"AuditDecision", 'DateTime'>
    readonly updatedAt: FieldRef<"AuditDecision", 'DateTime'>
  }
    

  // Custom InputTypes
  /**
   * AuditDecision findUnique
   */
  export type AuditDecisionFindUniqueArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the AuditDecision
     */
    select?: AuditDecisionSelect<ExtArgs> | null
    /**
     * Omit specific fields from the AuditDecision
     */
    omit?: AuditDecisionOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: AuditDecisionInclude<ExtArgs> | null
    /**
     * Filter, which AuditDecision to fetch.
     */
    where: AuditDecisionWhereUniqueInput
  }

  /**
   * AuditDecision findUniqueOrThrow
   */
  export type AuditDecisionFindUniqueOrThrowArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the AuditDecision
     */
    select?: AuditDecisionSelect<ExtArgs> | null
    /**
     * Omit specific fields from the AuditDecision
     */
    omit?: AuditDecisionOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: AuditDecisionInclude<ExtArgs> | null
    /**
     * Filter, which AuditDecision to fetch.
     */
    where: AuditDecisionWhereUniqueInput
  }

  /**
   * AuditDecision findFirst
   */
  export type AuditDecisionFindFirstArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the AuditDecision
     */
    select?: AuditDecisionSelect<ExtArgs> | null
    /**
     * Omit specific fields from the AuditDecision
     */
    omit?: AuditDecisionOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: AuditDecisionInclude<ExtArgs> | null
    /**
     * Filter, which AuditDecision to fetch.
     */
    where?: AuditDecisionWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of AuditDecisions to fetch.
     */
    orderBy?: AuditDecisionOrderByWithRelationInput | AuditDecisionOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for searching for AuditDecisions.
     */
    cursor?: AuditDecisionWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` AuditDecisions from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` AuditDecisions.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/distinct Distinct Docs}
     * 
     * Filter by unique combinations of AuditDecisions.
     */
    distinct?: AuditDecisionScalarFieldEnum | AuditDecisionScalarFieldEnum[]
  }

  /**
   * AuditDecision findFirstOrThrow
   */
  export type AuditDecisionFindFirstOrThrowArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the AuditDecision
     */
    select?: AuditDecisionSelect<ExtArgs> | null
    /**
     * Omit specific fields from the AuditDecision
     */
    omit?: AuditDecisionOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: AuditDecisionInclude<ExtArgs> | null
    /**
     * Filter, which AuditDecision to fetch.
     */
    where?: AuditDecisionWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of AuditDecisions to fetch.
     */
    orderBy?: AuditDecisionOrderByWithRelationInput | AuditDecisionOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for searching for AuditDecisions.
     */
    cursor?: AuditDecisionWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` AuditDecisions from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` AuditDecisions.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/distinct Distinct Docs}
     * 
     * Filter by unique combinations of AuditDecisions.
     */
    distinct?: AuditDecisionScalarFieldEnum | AuditDecisionScalarFieldEnum[]
  }

  /**
   * AuditDecision findMany
   */
  export type AuditDecisionFindManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the AuditDecision
     */
    select?: AuditDecisionSelect<ExtArgs> | null
    /**
     * Omit specific fields from the AuditDecision
     */
    omit?: AuditDecisionOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: AuditDecisionInclude<ExtArgs> | null
    /**
     * Filter, which AuditDecisions to fetch.
     */
    where?: AuditDecisionWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of AuditDecisions to fetch.
     */
    orderBy?: AuditDecisionOrderByWithRelationInput | AuditDecisionOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for listing AuditDecisions.
     */
    cursor?: AuditDecisionWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` AuditDecisions from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` AuditDecisions.
     */
    skip?: number
    distinct?: AuditDecisionScalarFieldEnum | AuditDecisionScalarFieldEnum[]
  }

  /**
   * AuditDecision create
   */
  export type AuditDecisionCreateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the AuditDecision
     */
    select?: AuditDecisionSelect<ExtArgs> | null
    /**
     * Omit specific fields from the AuditDecision
     */
    omit?: AuditDecisionOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: AuditDecisionInclude<ExtArgs> | null
    /**
     * The data needed to create a AuditDecision.
     */
    data: XOR<AuditDecisionCreateInput, AuditDecisionUncheckedCreateInput>
  }

  /**
   * AuditDecision createMany
   */
  export type AuditDecisionCreateManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * The data used to create many AuditDecisions.
     */
    data: AuditDecisionCreateManyInput | AuditDecisionCreateManyInput[]
    skipDuplicates?: boolean
  }

  /**
   * AuditDecision createManyAndReturn
   */
  export type AuditDecisionCreateManyAndReturnArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the AuditDecision
     */
    select?: AuditDecisionSelectCreateManyAndReturn<ExtArgs> | null
    /**
     * Omit specific fields from the AuditDecision
     */
    omit?: AuditDecisionOmit<ExtArgs> | null
    /**
     * The data used to create many AuditDecisions.
     */
    data: AuditDecisionCreateManyInput | AuditDecisionCreateManyInput[]
    skipDuplicates?: boolean
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: AuditDecisionIncludeCreateManyAndReturn<ExtArgs> | null
  }

  /**
   * AuditDecision update
   */
  export type AuditDecisionUpdateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the AuditDecision
     */
    select?: AuditDecisionSelect<ExtArgs> | null
    /**
     * Omit specific fields from the AuditDecision
     */
    omit?: AuditDecisionOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: AuditDecisionInclude<ExtArgs> | null
    /**
     * The data needed to update a AuditDecision.
     */
    data: XOR<AuditDecisionUpdateInput, AuditDecisionUncheckedUpdateInput>
    /**
     * Choose, which AuditDecision to update.
     */
    where: AuditDecisionWhereUniqueInput
  }

  /**
   * AuditDecision updateMany
   */
  export type AuditDecisionUpdateManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * The data used to update AuditDecisions.
     */
    data: XOR<AuditDecisionUpdateManyMutationInput, AuditDecisionUncheckedUpdateManyInput>
    /**
     * Filter which AuditDecisions to update
     */
    where?: AuditDecisionWhereInput
    /**
     * Limit how many AuditDecisions to update.
     */
    limit?: number
  }

  /**
   * AuditDecision updateManyAndReturn
   */
  export type AuditDecisionUpdateManyAndReturnArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the AuditDecision
     */
    select?: AuditDecisionSelectUpdateManyAndReturn<ExtArgs> | null
    /**
     * Omit specific fields from the AuditDecision
     */
    omit?: AuditDecisionOmit<ExtArgs> | null
    /**
     * The data used to update AuditDecisions.
     */
    data: XOR<AuditDecisionUpdateManyMutationInput, AuditDecisionUncheckedUpdateManyInput>
    /**
     * Filter which AuditDecisions to update
     */
    where?: AuditDecisionWhereInput
    /**
     * Limit how many AuditDecisions to update.
     */
    limit?: number
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: AuditDecisionIncludeUpdateManyAndReturn<ExtArgs> | null
  }

  /**
   * AuditDecision upsert
   */
  export type AuditDecisionUpsertArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the AuditDecision
     */
    select?: AuditDecisionSelect<ExtArgs> | null
    /**
     * Omit specific fields from the AuditDecision
     */
    omit?: AuditDecisionOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: AuditDecisionInclude<ExtArgs> | null
    /**
     * The filter to search for the AuditDecision to update in case it exists.
     */
    where: AuditDecisionWhereUniqueInput
    /**
     * In case the AuditDecision found by the `where` argument doesn't exist, create a new AuditDecision with this data.
     */
    create: XOR<AuditDecisionCreateInput, AuditDecisionUncheckedCreateInput>
    /**
     * In case the AuditDecision was found with the provided `where` argument, update it with this data.
     */
    update: XOR<AuditDecisionUpdateInput, AuditDecisionUncheckedUpdateInput>
  }

  /**
   * AuditDecision delete
   */
  export type AuditDecisionDeleteArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the AuditDecision
     */
    select?: AuditDecisionSelect<ExtArgs> | null
    /**
     * Omit specific fields from the AuditDecision
     */
    omit?: AuditDecisionOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: AuditDecisionInclude<ExtArgs> | null
    /**
     * Filter which AuditDecision to delete.
     */
    where: AuditDecisionWhereUniqueInput
  }

  /**
   * AuditDecision deleteMany
   */
  export type AuditDecisionDeleteManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Filter which AuditDecisions to delete
     */
    where?: AuditDecisionWhereInput
    /**
     * Limit how many AuditDecisions to delete.
     */
    limit?: number
  }

  /**
   * AuditDecision.evidence
   */
  export type AuditDecision$evidenceArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Evidence
     */
    select?: EvidenceSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Evidence
     */
    omit?: EvidenceOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: EvidenceInclude<ExtArgs> | null
    where?: EvidenceWhereInput
    orderBy?: EvidenceOrderByWithRelationInput | EvidenceOrderByWithRelationInput[]
    cursor?: EvidenceWhereUniqueInput
    take?: number
    skip?: number
    distinct?: EvidenceScalarFieldEnum | EvidenceScalarFieldEnum[]
  }

  /**
   * AuditDecision without action
   */
  export type AuditDecisionDefaultArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the AuditDecision
     */
    select?: AuditDecisionSelect<ExtArgs> | null
    /**
     * Omit specific fields from the AuditDecision
     */
    omit?: AuditDecisionOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: AuditDecisionInclude<ExtArgs> | null
  }


  /**
   * Model Evidence
   */

  export type AggregateEvidence = {
    _count: EvidenceCountAggregateOutputType | null
    _avg: EvidenceAvgAggregateOutputType | null
    _sum: EvidenceSumAggregateOutputType | null
    _min: EvidenceMinAggregateOutputType | null
    _max: EvidenceMaxAggregateOutputType | null
  }

  export type EvidenceAvgAggregateOutputType = {
    size: number | null
  }

  export type EvidenceSumAggregateOutputType = {
    size: number | null
  }

  export type EvidenceMinAggregateOutputType = {
    id: string | null
    auditDecisionId: string | null
    type: $Enums.EvidenceType | null
    filename: string | null
    size: number | null
    hash: string | null
    createdAt: Date | null
  }

  export type EvidenceMaxAggregateOutputType = {
    id: string | null
    auditDecisionId: string | null
    type: $Enums.EvidenceType | null
    filename: string | null
    size: number | null
    hash: string | null
    createdAt: Date | null
  }

  export type EvidenceCountAggregateOutputType = {
    id: number
    auditDecisionId: number
    type: number
    filename: number
    size: number
    hash: number
    metadata: number
    createdAt: number
    _all: number
  }


  export type EvidenceAvgAggregateInputType = {
    size?: true
  }

  export type EvidenceSumAggregateInputType = {
    size?: true
  }

  export type EvidenceMinAggregateInputType = {
    id?: true
    auditDecisionId?: true
    type?: true
    filename?: true
    size?: true
    hash?: true
    createdAt?: true
  }

  export type EvidenceMaxAggregateInputType = {
    id?: true
    auditDecisionId?: true
    type?: true
    filename?: true
    size?: true
    hash?: true
    createdAt?: true
  }

  export type EvidenceCountAggregateInputType = {
    id?: true
    auditDecisionId?: true
    type?: true
    filename?: true
    size?: true
    hash?: true
    metadata?: true
    createdAt?: true
    _all?: true
  }

  export type EvidenceAggregateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Filter which Evidence to aggregate.
     */
    where?: EvidenceWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of Evidences to fetch.
     */
    orderBy?: EvidenceOrderByWithRelationInput | EvidenceOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the start position
     */
    cursor?: EvidenceWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` Evidences from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` Evidences.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Count returned Evidences
    **/
    _count?: true | EvidenceCountAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to average
    **/
    _avg?: EvidenceAvgAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to sum
    **/
    _sum?: EvidenceSumAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to find the minimum value
    **/
    _min?: EvidenceMinAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to find the maximum value
    **/
    _max?: EvidenceMaxAggregateInputType
  }

  export type GetEvidenceAggregateType<T extends EvidenceAggregateArgs> = {
        [P in keyof T & keyof AggregateEvidence]: P extends '_count' | 'count'
      ? T[P] extends true
        ? number
        : GetScalarType<T[P], AggregateEvidence[P]>
      : GetScalarType<T[P], AggregateEvidence[P]>
  }




  export type EvidenceGroupByArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    where?: EvidenceWhereInput
    orderBy?: EvidenceOrderByWithAggregationInput | EvidenceOrderByWithAggregationInput[]
    by: EvidenceScalarFieldEnum[] | EvidenceScalarFieldEnum
    having?: EvidenceScalarWhereWithAggregatesInput
    take?: number
    skip?: number
    _count?: EvidenceCountAggregateInputType | true
    _avg?: EvidenceAvgAggregateInputType
    _sum?: EvidenceSumAggregateInputType
    _min?: EvidenceMinAggregateInputType
    _max?: EvidenceMaxAggregateInputType
  }

  export type EvidenceGroupByOutputType = {
    id: string
    auditDecisionId: string
    type: $Enums.EvidenceType
    filename: string
    size: number
    hash: string | null
    metadata: JsonValue | null
    createdAt: Date
    _count: EvidenceCountAggregateOutputType | null
    _avg: EvidenceAvgAggregateOutputType | null
    _sum: EvidenceSumAggregateOutputType | null
    _min: EvidenceMinAggregateOutputType | null
    _max: EvidenceMaxAggregateOutputType | null
  }

  type GetEvidenceGroupByPayload<T extends EvidenceGroupByArgs> = Prisma.PrismaPromise<
    Array<
      PickEnumerable<EvidenceGroupByOutputType, T['by']> &
        {
          [P in ((keyof T) & (keyof EvidenceGroupByOutputType))]: P extends '_count'
            ? T[P] extends boolean
              ? number
              : GetScalarType<T[P], EvidenceGroupByOutputType[P]>
            : GetScalarType<T[P], EvidenceGroupByOutputType[P]>
        }
      >
    >


  export type EvidenceSelect<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetSelect<{
    id?: boolean
    auditDecisionId?: boolean
    type?: boolean
    filename?: boolean
    size?: boolean
    hash?: boolean
    metadata?: boolean
    createdAt?: boolean
    auditDecision?: boolean | AuditDecisionDefaultArgs<ExtArgs>
  }, ExtArgs["result"]["evidence"]>

  export type EvidenceSelectCreateManyAndReturn<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetSelect<{
    id?: boolean
    auditDecisionId?: boolean
    type?: boolean
    filename?: boolean
    size?: boolean
    hash?: boolean
    metadata?: boolean
    createdAt?: boolean
    auditDecision?: boolean | AuditDecisionDefaultArgs<ExtArgs>
  }, ExtArgs["result"]["evidence"]>

  export type EvidenceSelectUpdateManyAndReturn<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetSelect<{
    id?: boolean
    auditDecisionId?: boolean
    type?: boolean
    filename?: boolean
    size?: boolean
    hash?: boolean
    metadata?: boolean
    createdAt?: boolean
    auditDecision?: boolean | AuditDecisionDefaultArgs<ExtArgs>
  }, ExtArgs["result"]["evidence"]>

  export type EvidenceSelectScalar = {
    id?: boolean
    auditDecisionId?: boolean
    type?: boolean
    filename?: boolean
    size?: boolean
    hash?: boolean
    metadata?: boolean
    createdAt?: boolean
  }

  export type EvidenceOmit<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetOmit<"id" | "auditDecisionId" | "type" | "filename" | "size" | "hash" | "metadata" | "createdAt", ExtArgs["result"]["evidence"]>
  export type EvidenceInclude<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    auditDecision?: boolean | AuditDecisionDefaultArgs<ExtArgs>
  }
  export type EvidenceIncludeCreateManyAndReturn<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    auditDecision?: boolean | AuditDecisionDefaultArgs<ExtArgs>
  }
  export type EvidenceIncludeUpdateManyAndReturn<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    auditDecision?: boolean | AuditDecisionDefaultArgs<ExtArgs>
  }

  export type $EvidencePayload<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    name: "Evidence"
    objects: {
      auditDecision: Prisma.$AuditDecisionPayload<ExtArgs>
    }
    scalars: $Extensions.GetPayloadResult<{
      id: string
      auditDecisionId: string
      type: $Enums.EvidenceType
      filename: string
      size: number
      hash: string | null
      metadata: Prisma.JsonValue | null
      createdAt: Date
    }, ExtArgs["result"]["evidence"]>
    composites: {}
  }

  type EvidenceGetPayload<S extends boolean | null | undefined | EvidenceDefaultArgs> = $Result.GetResult<Prisma.$EvidencePayload, S>

  type EvidenceCountArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> =
    Omit<EvidenceFindManyArgs, 'select' | 'include' | 'distinct' | 'omit'> & {
      select?: EvidenceCountAggregateInputType | true
    }

  export interface EvidenceDelegate<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs, GlobalOmitOptions = {}> {
    [K: symbol]: { types: Prisma.TypeMap<ExtArgs>['model']['Evidence'], meta: { name: 'Evidence' } }
    /**
     * Find zero or one Evidence that matches the filter.
     * @param {EvidenceFindUniqueArgs} args - Arguments to find a Evidence
     * @example
     * // Get one Evidence
     * const evidence = await prisma.evidence.findUnique({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findUnique<T extends EvidenceFindUniqueArgs>(args: SelectSubset<T, EvidenceFindUniqueArgs<ExtArgs>>): Prisma__EvidenceClient<$Result.GetResult<Prisma.$EvidencePayload<ExtArgs>, T, "findUnique", GlobalOmitOptions> | null, null, ExtArgs, GlobalOmitOptions>

    /**
     * Find one Evidence that matches the filter or throw an error with `error.code='P2025'`
     * if no matches were found.
     * @param {EvidenceFindUniqueOrThrowArgs} args - Arguments to find a Evidence
     * @example
     * // Get one Evidence
     * const evidence = await prisma.evidence.findUniqueOrThrow({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findUniqueOrThrow<T extends EvidenceFindUniqueOrThrowArgs>(args: SelectSubset<T, EvidenceFindUniqueOrThrowArgs<ExtArgs>>): Prisma__EvidenceClient<$Result.GetResult<Prisma.$EvidencePayload<ExtArgs>, T, "findUniqueOrThrow", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Find the first Evidence that matches the filter.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {EvidenceFindFirstArgs} args - Arguments to find a Evidence
     * @example
     * // Get one Evidence
     * const evidence = await prisma.evidence.findFirst({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findFirst<T extends EvidenceFindFirstArgs>(args?: SelectSubset<T, EvidenceFindFirstArgs<ExtArgs>>): Prisma__EvidenceClient<$Result.GetResult<Prisma.$EvidencePayload<ExtArgs>, T, "findFirst", GlobalOmitOptions> | null, null, ExtArgs, GlobalOmitOptions>

    /**
     * Find the first Evidence that matches the filter or
     * throw `PrismaKnownClientError` with `P2025` code if no matches were found.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {EvidenceFindFirstOrThrowArgs} args - Arguments to find a Evidence
     * @example
     * // Get one Evidence
     * const evidence = await prisma.evidence.findFirstOrThrow({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findFirstOrThrow<T extends EvidenceFindFirstOrThrowArgs>(args?: SelectSubset<T, EvidenceFindFirstOrThrowArgs<ExtArgs>>): Prisma__EvidenceClient<$Result.GetResult<Prisma.$EvidencePayload<ExtArgs>, T, "findFirstOrThrow", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Find zero or more Evidences that matches the filter.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {EvidenceFindManyArgs} args - Arguments to filter and select certain fields only.
     * @example
     * // Get all Evidences
     * const evidences = await prisma.evidence.findMany()
     * 
     * // Get first 10 Evidences
     * const evidences = await prisma.evidence.findMany({ take: 10 })
     * 
     * // Only select the `id`
     * const evidenceWithIdOnly = await prisma.evidence.findMany({ select: { id: true } })
     * 
     */
    findMany<T extends EvidenceFindManyArgs>(args?: SelectSubset<T, EvidenceFindManyArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$EvidencePayload<ExtArgs>, T, "findMany", GlobalOmitOptions>>

    /**
     * Create a Evidence.
     * @param {EvidenceCreateArgs} args - Arguments to create a Evidence.
     * @example
     * // Create one Evidence
     * const Evidence = await prisma.evidence.create({
     *   data: {
     *     // ... data to create a Evidence
     *   }
     * })
     * 
     */
    create<T extends EvidenceCreateArgs>(args: SelectSubset<T, EvidenceCreateArgs<ExtArgs>>): Prisma__EvidenceClient<$Result.GetResult<Prisma.$EvidencePayload<ExtArgs>, T, "create", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Create many Evidences.
     * @param {EvidenceCreateManyArgs} args - Arguments to create many Evidences.
     * @example
     * // Create many Evidences
     * const evidence = await prisma.evidence.createMany({
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     *     
     */
    createMany<T extends EvidenceCreateManyArgs>(args?: SelectSubset<T, EvidenceCreateManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Create many Evidences and returns the data saved in the database.
     * @param {EvidenceCreateManyAndReturnArgs} args - Arguments to create many Evidences.
     * @example
     * // Create many Evidences
     * const evidence = await prisma.evidence.createManyAndReturn({
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * 
     * // Create many Evidences and only return the `id`
     * const evidenceWithIdOnly = await prisma.evidence.createManyAndReturn({
     *   select: { id: true },
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * 
     */
    createManyAndReturn<T extends EvidenceCreateManyAndReturnArgs>(args?: SelectSubset<T, EvidenceCreateManyAndReturnArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$EvidencePayload<ExtArgs>, T, "createManyAndReturn", GlobalOmitOptions>>

    /**
     * Delete a Evidence.
     * @param {EvidenceDeleteArgs} args - Arguments to delete one Evidence.
     * @example
     * // Delete one Evidence
     * const Evidence = await prisma.evidence.delete({
     *   where: {
     *     // ... filter to delete one Evidence
     *   }
     * })
     * 
     */
    delete<T extends EvidenceDeleteArgs>(args: SelectSubset<T, EvidenceDeleteArgs<ExtArgs>>): Prisma__EvidenceClient<$Result.GetResult<Prisma.$EvidencePayload<ExtArgs>, T, "delete", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Update one Evidence.
     * @param {EvidenceUpdateArgs} args - Arguments to update one Evidence.
     * @example
     * // Update one Evidence
     * const evidence = await prisma.evidence.update({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: {
     *     // ... provide data here
     *   }
     * })
     * 
     */
    update<T extends EvidenceUpdateArgs>(args: SelectSubset<T, EvidenceUpdateArgs<ExtArgs>>): Prisma__EvidenceClient<$Result.GetResult<Prisma.$EvidencePayload<ExtArgs>, T, "update", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Delete zero or more Evidences.
     * @param {EvidenceDeleteManyArgs} args - Arguments to filter Evidences to delete.
     * @example
     * // Delete a few Evidences
     * const { count } = await prisma.evidence.deleteMany({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     * 
     */
    deleteMany<T extends EvidenceDeleteManyArgs>(args?: SelectSubset<T, EvidenceDeleteManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Update zero or more Evidences.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {EvidenceUpdateManyArgs} args - Arguments to update one or more rows.
     * @example
     * // Update many Evidences
     * const evidence = await prisma.evidence.updateMany({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: {
     *     // ... provide data here
     *   }
     * })
     * 
     */
    updateMany<T extends EvidenceUpdateManyArgs>(args: SelectSubset<T, EvidenceUpdateManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Update zero or more Evidences and returns the data updated in the database.
     * @param {EvidenceUpdateManyAndReturnArgs} args - Arguments to update many Evidences.
     * @example
     * // Update many Evidences
     * const evidence = await prisma.evidence.updateManyAndReturn({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * 
     * // Update zero or more Evidences and only return the `id`
     * const evidenceWithIdOnly = await prisma.evidence.updateManyAndReturn({
     *   select: { id: true },
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * 
     */
    updateManyAndReturn<T extends EvidenceUpdateManyAndReturnArgs>(args: SelectSubset<T, EvidenceUpdateManyAndReturnArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$EvidencePayload<ExtArgs>, T, "updateManyAndReturn", GlobalOmitOptions>>

    /**
     * Create or update one Evidence.
     * @param {EvidenceUpsertArgs} args - Arguments to update or create a Evidence.
     * @example
     * // Update or create a Evidence
     * const evidence = await prisma.evidence.upsert({
     *   create: {
     *     // ... data to create a Evidence
     *   },
     *   update: {
     *     // ... in case it already exists, update
     *   },
     *   where: {
     *     // ... the filter for the Evidence we want to update
     *   }
     * })
     */
    upsert<T extends EvidenceUpsertArgs>(args: SelectSubset<T, EvidenceUpsertArgs<ExtArgs>>): Prisma__EvidenceClient<$Result.GetResult<Prisma.$EvidencePayload<ExtArgs>, T, "upsert", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>


    /**
     * Count the number of Evidences.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {EvidenceCountArgs} args - Arguments to filter Evidences to count.
     * @example
     * // Count the number of Evidences
     * const count = await prisma.evidence.count({
     *   where: {
     *     // ... the filter for the Evidences we want to count
     *   }
     * })
    **/
    count<T extends EvidenceCountArgs>(
      args?: Subset<T, EvidenceCountArgs>,
    ): Prisma.PrismaPromise<
      T extends $Utils.Record<'select', any>
        ? T['select'] extends true
          ? number
          : GetScalarType<T['select'], EvidenceCountAggregateOutputType>
        : number
    >

    /**
     * Allows you to perform aggregations operations on a Evidence.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {EvidenceAggregateArgs} args - Select which aggregations you would like to apply and on what fields.
     * @example
     * // Ordered by age ascending
     * // Where email contains prisma.io
     * // Limited to the 10 users
     * const aggregations = await prisma.user.aggregate({
     *   _avg: {
     *     age: true,
     *   },
     *   where: {
     *     email: {
     *       contains: "prisma.io",
     *     },
     *   },
     *   orderBy: {
     *     age: "asc",
     *   },
     *   take: 10,
     * })
    **/
    aggregate<T extends EvidenceAggregateArgs>(args: Subset<T, EvidenceAggregateArgs>): Prisma.PrismaPromise<GetEvidenceAggregateType<T>>

    /**
     * Group by Evidence.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {EvidenceGroupByArgs} args - Group by arguments.
     * @example
     * // Group by city, order by createdAt, get count
     * const result = await prisma.user.groupBy({
     *   by: ['city', 'createdAt'],
     *   orderBy: {
     *     createdAt: true
     *   },
     *   _count: {
     *     _all: true
     *   },
     * })
     * 
    **/
    groupBy<
      T extends EvidenceGroupByArgs,
      HasSelectOrTake extends Or<
        Extends<'skip', Keys<T>>,
        Extends<'take', Keys<T>>
      >,
      OrderByArg extends True extends HasSelectOrTake
        ? { orderBy: EvidenceGroupByArgs['orderBy'] }
        : { orderBy?: EvidenceGroupByArgs['orderBy'] },
      OrderFields extends ExcludeUnderscoreKeys<Keys<MaybeTupleToUnion<T['orderBy']>>>,
      ByFields extends MaybeTupleToUnion<T['by']>,
      ByValid extends Has<ByFields, OrderFields>,
      HavingFields extends GetHavingFields<T['having']>,
      HavingValid extends Has<ByFields, HavingFields>,
      ByEmpty extends T['by'] extends never[] ? True : False,
      InputErrors extends ByEmpty extends True
      ? `Error: "by" must not be empty.`
      : HavingValid extends False
      ? {
          [P in HavingFields]: P extends ByFields
            ? never
            : P extends string
            ? `Error: Field "${P}" used in "having" needs to be provided in "by".`
            : [
                Error,
                'Field ',
                P,
                ` in "having" needs to be provided in "by"`,
              ]
        }[HavingFields]
      : 'take' extends Keys<T>
      ? 'orderBy' extends Keys<T>
        ? ByValid extends True
          ? {}
          : {
              [P in OrderFields]: P extends ByFields
                ? never
                : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
            }[OrderFields]
        : 'Error: If you provide "take", you also need to provide "orderBy"'
      : 'skip' extends Keys<T>
      ? 'orderBy' extends Keys<T>
        ? ByValid extends True
          ? {}
          : {
              [P in OrderFields]: P extends ByFields
                ? never
                : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
            }[OrderFields]
        : 'Error: If you provide "skip", you also need to provide "orderBy"'
      : ByValid extends True
      ? {}
      : {
          [P in OrderFields]: P extends ByFields
            ? never
            : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
        }[OrderFields]
    >(args: SubsetIntersection<T, EvidenceGroupByArgs, OrderByArg> & InputErrors): {} extends InputErrors ? GetEvidenceGroupByPayload<T> : Prisma.PrismaPromise<InputErrors>
  /**
   * Fields of the Evidence model
   */
  readonly fields: EvidenceFieldRefs;
  }

  /**
   * The delegate class that acts as a "Promise-like" for Evidence.
   * Why is this prefixed with `Prisma__`?
   * Because we want to prevent naming conflicts as mentioned in
   * https://github.com/prisma/prisma-client-js/issues/707
   */
  export interface Prisma__EvidenceClient<T, Null = never, ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs, GlobalOmitOptions = {}> extends Prisma.PrismaPromise<T> {
    readonly [Symbol.toStringTag]: "PrismaPromise"
    auditDecision<T extends AuditDecisionDefaultArgs<ExtArgs> = {}>(args?: Subset<T, AuditDecisionDefaultArgs<ExtArgs>>): Prisma__AuditDecisionClient<$Result.GetResult<Prisma.$AuditDecisionPayload<ExtArgs>, T, "findUniqueOrThrow", GlobalOmitOptions> | Null, Null, ExtArgs, GlobalOmitOptions>
    /**
     * Attaches callbacks for the resolution and/or rejection of the Promise.
     * @param onfulfilled The callback to execute when the Promise is resolved.
     * @param onrejected The callback to execute when the Promise is rejected.
     * @returns A Promise for the completion of which ever callback is executed.
     */
    then<TResult1 = T, TResult2 = never>(onfulfilled?: ((value: T) => TResult1 | PromiseLike<TResult1>) | undefined | null, onrejected?: ((reason: any) => TResult2 | PromiseLike<TResult2>) | undefined | null): $Utils.JsPromise<TResult1 | TResult2>
    /**
     * Attaches a callback for only the rejection of the Promise.
     * @param onrejected The callback to execute when the Promise is rejected.
     * @returns A Promise for the completion of the callback.
     */
    catch<TResult = never>(onrejected?: ((reason: any) => TResult | PromiseLike<TResult>) | undefined | null): $Utils.JsPromise<T | TResult>
    /**
     * Attaches a callback that is invoked when the Promise is settled (fulfilled or rejected). The
     * resolved value cannot be modified from the callback.
     * @param onfinally The callback to execute when the Promise is settled (fulfilled or rejected).
     * @returns A Promise for the completion of the callback.
     */
    finally(onfinally?: (() => void) | undefined | null): $Utils.JsPromise<T>
  }




  /**
   * Fields of the Evidence model
   */
  interface EvidenceFieldRefs {
    readonly id: FieldRef<"Evidence", 'String'>
    readonly auditDecisionId: FieldRef<"Evidence", 'String'>
    readonly type: FieldRef<"Evidence", 'EvidenceType'>
    readonly filename: FieldRef<"Evidence", 'String'>
    readonly size: FieldRef<"Evidence", 'Int'>
    readonly hash: FieldRef<"Evidence", 'String'>
    readonly metadata: FieldRef<"Evidence", 'Json'>
    readonly createdAt: FieldRef<"Evidence", 'DateTime'>
  }
    

  // Custom InputTypes
  /**
   * Evidence findUnique
   */
  export type EvidenceFindUniqueArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Evidence
     */
    select?: EvidenceSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Evidence
     */
    omit?: EvidenceOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: EvidenceInclude<ExtArgs> | null
    /**
     * Filter, which Evidence to fetch.
     */
    where: EvidenceWhereUniqueInput
  }

  /**
   * Evidence findUniqueOrThrow
   */
  export type EvidenceFindUniqueOrThrowArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Evidence
     */
    select?: EvidenceSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Evidence
     */
    omit?: EvidenceOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: EvidenceInclude<ExtArgs> | null
    /**
     * Filter, which Evidence to fetch.
     */
    where: EvidenceWhereUniqueInput
  }

  /**
   * Evidence findFirst
   */
  export type EvidenceFindFirstArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Evidence
     */
    select?: EvidenceSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Evidence
     */
    omit?: EvidenceOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: EvidenceInclude<ExtArgs> | null
    /**
     * Filter, which Evidence to fetch.
     */
    where?: EvidenceWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of Evidences to fetch.
     */
    orderBy?: EvidenceOrderByWithRelationInput | EvidenceOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for searching for Evidences.
     */
    cursor?: EvidenceWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` Evidences from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` Evidences.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/distinct Distinct Docs}
     * 
     * Filter by unique combinations of Evidences.
     */
    distinct?: EvidenceScalarFieldEnum | EvidenceScalarFieldEnum[]
  }

  /**
   * Evidence findFirstOrThrow
   */
  export type EvidenceFindFirstOrThrowArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Evidence
     */
    select?: EvidenceSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Evidence
     */
    omit?: EvidenceOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: EvidenceInclude<ExtArgs> | null
    /**
     * Filter, which Evidence to fetch.
     */
    where?: EvidenceWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of Evidences to fetch.
     */
    orderBy?: EvidenceOrderByWithRelationInput | EvidenceOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for searching for Evidences.
     */
    cursor?: EvidenceWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` Evidences from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` Evidences.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/distinct Distinct Docs}
     * 
     * Filter by unique combinations of Evidences.
     */
    distinct?: EvidenceScalarFieldEnum | EvidenceScalarFieldEnum[]
  }

  /**
   * Evidence findMany
   */
  export type EvidenceFindManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Evidence
     */
    select?: EvidenceSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Evidence
     */
    omit?: EvidenceOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: EvidenceInclude<ExtArgs> | null
    /**
     * Filter, which Evidences to fetch.
     */
    where?: EvidenceWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of Evidences to fetch.
     */
    orderBy?: EvidenceOrderByWithRelationInput | EvidenceOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for listing Evidences.
     */
    cursor?: EvidenceWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` Evidences from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` Evidences.
     */
    skip?: number
    distinct?: EvidenceScalarFieldEnum | EvidenceScalarFieldEnum[]
  }

  /**
   * Evidence create
   */
  export type EvidenceCreateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Evidence
     */
    select?: EvidenceSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Evidence
     */
    omit?: EvidenceOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: EvidenceInclude<ExtArgs> | null
    /**
     * The data needed to create a Evidence.
     */
    data: XOR<EvidenceCreateInput, EvidenceUncheckedCreateInput>
  }

  /**
   * Evidence createMany
   */
  export type EvidenceCreateManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * The data used to create many Evidences.
     */
    data: EvidenceCreateManyInput | EvidenceCreateManyInput[]
    skipDuplicates?: boolean
  }

  /**
   * Evidence createManyAndReturn
   */
  export type EvidenceCreateManyAndReturnArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Evidence
     */
    select?: EvidenceSelectCreateManyAndReturn<ExtArgs> | null
    /**
     * Omit specific fields from the Evidence
     */
    omit?: EvidenceOmit<ExtArgs> | null
    /**
     * The data used to create many Evidences.
     */
    data: EvidenceCreateManyInput | EvidenceCreateManyInput[]
    skipDuplicates?: boolean
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: EvidenceIncludeCreateManyAndReturn<ExtArgs> | null
  }

  /**
   * Evidence update
   */
  export type EvidenceUpdateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Evidence
     */
    select?: EvidenceSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Evidence
     */
    omit?: EvidenceOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: EvidenceInclude<ExtArgs> | null
    /**
     * The data needed to update a Evidence.
     */
    data: XOR<EvidenceUpdateInput, EvidenceUncheckedUpdateInput>
    /**
     * Choose, which Evidence to update.
     */
    where: EvidenceWhereUniqueInput
  }

  /**
   * Evidence updateMany
   */
  export type EvidenceUpdateManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * The data used to update Evidences.
     */
    data: XOR<EvidenceUpdateManyMutationInput, EvidenceUncheckedUpdateManyInput>
    /**
     * Filter which Evidences to update
     */
    where?: EvidenceWhereInput
    /**
     * Limit how many Evidences to update.
     */
    limit?: number
  }

  /**
   * Evidence updateManyAndReturn
   */
  export type EvidenceUpdateManyAndReturnArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Evidence
     */
    select?: EvidenceSelectUpdateManyAndReturn<ExtArgs> | null
    /**
     * Omit specific fields from the Evidence
     */
    omit?: EvidenceOmit<ExtArgs> | null
    /**
     * The data used to update Evidences.
     */
    data: XOR<EvidenceUpdateManyMutationInput, EvidenceUncheckedUpdateManyInput>
    /**
     * Filter which Evidences to update
     */
    where?: EvidenceWhereInput
    /**
     * Limit how many Evidences to update.
     */
    limit?: number
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: EvidenceIncludeUpdateManyAndReturn<ExtArgs> | null
  }

  /**
   * Evidence upsert
   */
  export type EvidenceUpsertArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Evidence
     */
    select?: EvidenceSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Evidence
     */
    omit?: EvidenceOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: EvidenceInclude<ExtArgs> | null
    /**
     * The filter to search for the Evidence to update in case it exists.
     */
    where: EvidenceWhereUniqueInput
    /**
     * In case the Evidence found by the `where` argument doesn't exist, create a new Evidence with this data.
     */
    create: XOR<EvidenceCreateInput, EvidenceUncheckedCreateInput>
    /**
     * In case the Evidence was found with the provided `where` argument, update it with this data.
     */
    update: XOR<EvidenceUpdateInput, EvidenceUncheckedUpdateInput>
  }

  /**
   * Evidence delete
   */
  export type EvidenceDeleteArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Evidence
     */
    select?: EvidenceSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Evidence
     */
    omit?: EvidenceOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: EvidenceInclude<ExtArgs> | null
    /**
     * Filter which Evidence to delete.
     */
    where: EvidenceWhereUniqueInput
  }

  /**
   * Evidence deleteMany
   */
  export type EvidenceDeleteManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Filter which Evidences to delete
     */
    where?: EvidenceWhereInput
    /**
     * Limit how many Evidences to delete.
     */
    limit?: number
  }

  /**
   * Evidence without action
   */
  export type EvidenceDefaultArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Evidence
     */
    select?: EvidenceSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Evidence
     */
    omit?: EvidenceOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: EvidenceInclude<ExtArgs> | null
  }


  /**
   * Enums
   */

  export const TransactionIsolationLevel: {
    ReadUncommitted: 'ReadUncommitted',
    ReadCommitted: 'ReadCommitted',
    RepeatableRead: 'RepeatableRead',
    Serializable: 'Serializable'
  };

  export type TransactionIsolationLevel = (typeof TransactionIsolationLevel)[keyof typeof TransactionIsolationLevel]


  export const UserScalarFieldEnum: {
    id: 'id',
    name: 'name',
    email: 'email',
    emailVerified: 'emailVerified',
    image: 'image',
    createdAt: 'createdAt',
    updatedAt: 'updatedAt',
    role: 'role',
    organization: 'organization',
    country: 'country'
  };

  export type UserScalarFieldEnum = (typeof UserScalarFieldEnum)[keyof typeof UserScalarFieldEnum]


  export const SessionScalarFieldEnum: {
    id: 'id',
    expiresAt: 'expiresAt',
    token: 'token',
    createdAt: 'createdAt',
    updatedAt: 'updatedAt',
    ipAddress: 'ipAddress',
    userAgent: 'userAgent',
    userId: 'userId'
  };

  export type SessionScalarFieldEnum = (typeof SessionScalarFieldEnum)[keyof typeof SessionScalarFieldEnum]


  export const AccountScalarFieldEnum: {
    id: 'id',
    accountId: 'accountId',
    providerId: 'providerId',
    userId: 'userId',
    accessToken: 'accessToken',
    refreshToken: 'refreshToken',
    idToken: 'idToken',
    accessTokenExpiresAt: 'accessTokenExpiresAt',
    refreshTokenExpiresAt: 'refreshTokenExpiresAt',
    scope: 'scope',
    password: 'password',
    createdAt: 'createdAt',
    updatedAt: 'updatedAt'
  };

  export type AccountScalarFieldEnum = (typeof AccountScalarFieldEnum)[keyof typeof AccountScalarFieldEnum]


  export const VerificationScalarFieldEnum: {
    id: 'id',
    identifier: 'identifier',
    value: 'value',
    expiresAt: 'expiresAt',
    createdAt: 'createdAt',
    updatedAt: 'updatedAt'
  };

  export type VerificationScalarFieldEnum = (typeof VerificationScalarFieldEnum)[keyof typeof VerificationScalarFieldEnum]


  export const CrisisScalarFieldEnum: {
    id: 'id',
    title: 'title',
    type: 'type',
    severity: 'severity',
    location: 'location',
    latitude: 'latitude',
    longitude: 'longitude',
    description: 'description',
    affectedPopulation: 'affectedPopulation',
    status: 'status',
    createdById: 'createdById',
    createdAt: 'createdAt',
    updatedAt: 'updatedAt'
  };

  export type CrisisScalarFieldEnum = (typeof CrisisScalarFieldEnum)[keyof typeof CrisisScalarFieldEnum]


  export const DecisionScalarFieldEnum: {
    id: 'id',
    crisisId: 'crisisId',
    title: 'title',
    decisionText: 'decisionText',
    rationale: 'rationale',
    confidenceScore: 'confidenceScore',
    optionA: 'optionA',
    optionB: 'optionB',
    optionC: 'optionC',
    selectedOption: 'selectedOption',
    outcome: 'outcome',
    madeById: 'madeById',
    createdAt: 'createdAt',
    updatedAt: 'updatedAt'
  };

  export type DecisionScalarFieldEnum = (typeof DecisionScalarFieldEnum)[keyof typeof DecisionScalarFieldEnum]


  export const AlertScalarFieldEnum: {
    id: 'id',
    crisisId: 'crisisId',
    type: 'type',
    severity: 'severity',
    message: 'message',
    isActive: 'isActive',
    triggeredAt: 'triggeredAt',
    resolvedAt: 'resolvedAt'
  };

  export type AlertScalarFieldEnum = (typeof AlertScalarFieldEnum)[keyof typeof AlertScalarFieldEnum]


  export const AuditDecisionScalarFieldEnum: {
    id: 'id',
    title: 'title',
    type: 'type',
    decisionMade: 'decisionMade',
    rationale: 'rationale',
    riskLevel: 'riskLevel',
    informationSources: 'informationSources',
    stakeholders: 'stakeholders',
    alternatives: 'alternatives',
    locationLat: 'locationLat',
    locationLng: 'locationLng',
    locationAddress: 'locationAddress',
    deviceId: 'deviceId',
    status: 'status',
    syncStatus: 'syncStatus',
    tags: 'tags',
    priority: 'priority',
    cryptoHash: 'cryptoHash',
    createdById: 'createdById',
    createdAt: 'createdAt',
    updatedAt: 'updatedAt'
  };

  export type AuditDecisionScalarFieldEnum = (typeof AuditDecisionScalarFieldEnum)[keyof typeof AuditDecisionScalarFieldEnum]


  export const EvidenceScalarFieldEnum: {
    id: 'id',
    auditDecisionId: 'auditDecisionId',
    type: 'type',
    filename: 'filename',
    size: 'size',
    hash: 'hash',
    metadata: 'metadata',
    createdAt: 'createdAt'
  };

  export type EvidenceScalarFieldEnum = (typeof EvidenceScalarFieldEnum)[keyof typeof EvidenceScalarFieldEnum]


  export const SortOrder: {
    asc: 'asc',
    desc: 'desc'
  };

  export type SortOrder = (typeof SortOrder)[keyof typeof SortOrder]


  export const JsonNullValueInput: {
    JsonNull: typeof JsonNull
  };

  export type JsonNullValueInput = (typeof JsonNullValueInput)[keyof typeof JsonNullValueInput]


  export const NullableJsonNullValueInput: {
    DbNull: typeof DbNull,
    JsonNull: typeof JsonNull
  };

  export type NullableJsonNullValueInput = (typeof NullableJsonNullValueInput)[keyof typeof NullableJsonNullValueInput]


  export const QueryMode: {
    default: 'default',
    insensitive: 'insensitive'
  };

  export type QueryMode = (typeof QueryMode)[keyof typeof QueryMode]


  export const NullsOrder: {
    first: 'first',
    last: 'last'
  };

  export type NullsOrder = (typeof NullsOrder)[keyof typeof NullsOrder]


  export const JsonNullValueFilter: {
    DbNull: typeof DbNull,
    JsonNull: typeof JsonNull,
    AnyNull: typeof AnyNull
  };

  export type JsonNullValueFilter = (typeof JsonNullValueFilter)[keyof typeof JsonNullValueFilter]


  /**
   * Field references
   */


  /**
   * Reference to a field of type 'String'
   */
  export type StringFieldRefInput<$PrismaModel> = FieldRefInputType<$PrismaModel, 'String'>
    


  /**
   * Reference to a field of type 'String[]'
   */
  export type ListStringFieldRefInput<$PrismaModel> = FieldRefInputType<$PrismaModel, 'String[]'>
    


  /**
   * Reference to a field of type 'Boolean'
   */
  export type BooleanFieldRefInput<$PrismaModel> = FieldRefInputType<$PrismaModel, 'Boolean'>
    


  /**
   * Reference to a field of type 'DateTime'
   */
  export type DateTimeFieldRefInput<$PrismaModel> = FieldRefInputType<$PrismaModel, 'DateTime'>
    


  /**
   * Reference to a field of type 'DateTime[]'
   */
  export type ListDateTimeFieldRefInput<$PrismaModel> = FieldRefInputType<$PrismaModel, 'DateTime[]'>
    


  /**
   * Reference to a field of type 'UserRole'
   */
  export type EnumUserRoleFieldRefInput<$PrismaModel> = FieldRefInputType<$PrismaModel, 'UserRole'>
    


  /**
   * Reference to a field of type 'UserRole[]'
   */
  export type ListEnumUserRoleFieldRefInput<$PrismaModel> = FieldRefInputType<$PrismaModel, 'UserRole[]'>
    


  /**
   * Reference to a field of type 'CrisisType'
   */
  export type EnumCrisisTypeFieldRefInput<$PrismaModel> = FieldRefInputType<$PrismaModel, 'CrisisType'>
    


  /**
   * Reference to a field of type 'CrisisType[]'
   */
  export type ListEnumCrisisTypeFieldRefInput<$PrismaModel> = FieldRefInputType<$PrismaModel, 'CrisisType[]'>
    


  /**
   * Reference to a field of type 'CrisisSeverity'
   */
  export type EnumCrisisSeverityFieldRefInput<$PrismaModel> = FieldRefInputType<$PrismaModel, 'CrisisSeverity'>
    


  /**
   * Reference to a field of type 'CrisisSeverity[]'
   */
  export type ListEnumCrisisSeverityFieldRefInput<$PrismaModel> = FieldRefInputType<$PrismaModel, 'CrisisSeverity[]'>
    


  /**
   * Reference to a field of type 'Float'
   */
  export type FloatFieldRefInput<$PrismaModel> = FieldRefInputType<$PrismaModel, 'Float'>
    


  /**
   * Reference to a field of type 'Float[]'
   */
  export type ListFloatFieldRefInput<$PrismaModel> = FieldRefInputType<$PrismaModel, 'Float[]'>
    


  /**
   * Reference to a field of type 'Int'
   */
  export type IntFieldRefInput<$PrismaModel> = FieldRefInputType<$PrismaModel, 'Int'>
    


  /**
   * Reference to a field of type 'Int[]'
   */
  export type ListIntFieldRefInput<$PrismaModel> = FieldRefInputType<$PrismaModel, 'Int[]'>
    


  /**
   * Reference to a field of type 'CrisisStatus'
   */
  export type EnumCrisisStatusFieldRefInput<$PrismaModel> = FieldRefInputType<$PrismaModel, 'CrisisStatus'>
    


  /**
   * Reference to a field of type 'CrisisStatus[]'
   */
  export type ListEnumCrisisStatusFieldRefInput<$PrismaModel> = FieldRefInputType<$PrismaModel, 'CrisisStatus[]'>
    


  /**
   * Reference to a field of type 'SelectedOption'
   */
  export type EnumSelectedOptionFieldRefInput<$PrismaModel> = FieldRefInputType<$PrismaModel, 'SelectedOption'>
    


  /**
   * Reference to a field of type 'SelectedOption[]'
   */
  export type ListEnumSelectedOptionFieldRefInput<$PrismaModel> = FieldRefInputType<$PrismaModel, 'SelectedOption[]'>
    


  /**
   * Reference to a field of type 'AlertType'
   */
  export type EnumAlertTypeFieldRefInput<$PrismaModel> = FieldRefInputType<$PrismaModel, 'AlertType'>
    


  /**
   * Reference to a field of type 'AlertType[]'
   */
  export type ListEnumAlertTypeFieldRefInput<$PrismaModel> = FieldRefInputType<$PrismaModel, 'AlertType[]'>
    


  /**
   * Reference to a field of type 'AlertSeverity'
   */
  export type EnumAlertSeverityFieldRefInput<$PrismaModel> = FieldRefInputType<$PrismaModel, 'AlertSeverity'>
    


  /**
   * Reference to a field of type 'AlertSeverity[]'
   */
  export type ListEnumAlertSeverityFieldRefInput<$PrismaModel> = FieldRefInputType<$PrismaModel, 'AlertSeverity[]'>
    


  /**
   * Reference to a field of type 'AuditDecisionType'
   */
  export type EnumAuditDecisionTypeFieldRefInput<$PrismaModel> = FieldRefInputType<$PrismaModel, 'AuditDecisionType'>
    


  /**
   * Reference to a field of type 'AuditDecisionType[]'
   */
  export type ListEnumAuditDecisionTypeFieldRefInput<$PrismaModel> = FieldRefInputType<$PrismaModel, 'AuditDecisionType[]'>
    


  /**
   * Reference to a field of type 'RiskLevel'
   */
  export type EnumRiskLevelFieldRefInput<$PrismaModel> = FieldRefInputType<$PrismaModel, 'RiskLevel'>
    


  /**
   * Reference to a field of type 'RiskLevel[]'
   */
  export type ListEnumRiskLevelFieldRefInput<$PrismaModel> = FieldRefInputType<$PrismaModel, 'RiskLevel[]'>
    


  /**
   * Reference to a field of type 'Json'
   */
  export type JsonFieldRefInput<$PrismaModel> = FieldRefInputType<$PrismaModel, 'Json'>
    


  /**
   * Reference to a field of type 'QueryMode'
   */
  export type EnumQueryModeFieldRefInput<$PrismaModel> = FieldRefInputType<$PrismaModel, 'QueryMode'>
    


  /**
   * Reference to a field of type 'AuditStatus'
   */
  export type EnumAuditStatusFieldRefInput<$PrismaModel> = FieldRefInputType<$PrismaModel, 'AuditStatus'>
    


  /**
   * Reference to a field of type 'AuditStatus[]'
   */
  export type ListEnumAuditStatusFieldRefInput<$PrismaModel> = FieldRefInputType<$PrismaModel, 'AuditStatus[]'>
    


  /**
   * Reference to a field of type 'SyncStatus'
   */
  export type EnumSyncStatusFieldRefInput<$PrismaModel> = FieldRefInputType<$PrismaModel, 'SyncStatus'>
    


  /**
   * Reference to a field of type 'SyncStatus[]'
   */
  export type ListEnumSyncStatusFieldRefInput<$PrismaModel> = FieldRefInputType<$PrismaModel, 'SyncStatus[]'>
    


  /**
   * Reference to a field of type 'Priority'
   */
  export type EnumPriorityFieldRefInput<$PrismaModel> = FieldRefInputType<$PrismaModel, 'Priority'>
    


  /**
   * Reference to a field of type 'Priority[]'
   */
  export type ListEnumPriorityFieldRefInput<$PrismaModel> = FieldRefInputType<$PrismaModel, 'Priority[]'>
    


  /**
   * Reference to a field of type 'EvidenceType'
   */
  export type EnumEvidenceTypeFieldRefInput<$PrismaModel> = FieldRefInputType<$PrismaModel, 'EvidenceType'>
    


  /**
   * Reference to a field of type 'EvidenceType[]'
   */
  export type ListEnumEvidenceTypeFieldRefInput<$PrismaModel> = FieldRefInputType<$PrismaModel, 'EvidenceType[]'>
    
  /**
   * Deep Input Types
   */


  export type UserWhereInput = {
    AND?: UserWhereInput | UserWhereInput[]
    OR?: UserWhereInput[]
    NOT?: UserWhereInput | UserWhereInput[]
    id?: StringFilter<"User"> | string
    name?: StringFilter<"User"> | string
    email?: StringFilter<"User"> | string
    emailVerified?: BoolFilter<"User"> | boolean
    image?: StringNullableFilter<"User"> | string | null
    createdAt?: DateTimeFilter<"User"> | Date | string
    updatedAt?: DateTimeFilter<"User"> | Date | string
    role?: EnumUserRoleFilter<"User"> | $Enums.UserRole
    organization?: StringNullableFilter<"User"> | string | null
    country?: StringNullableFilter<"User"> | string | null
    sessions?: SessionListRelationFilter
    accounts?: AccountListRelationFilter
    decisions?: DecisionListRelationFilter
    auditDecisions?: AuditDecisionListRelationFilter
    crises?: CrisisListRelationFilter
  }

  export type UserOrderByWithRelationInput = {
    id?: SortOrder
    name?: SortOrder
    email?: SortOrder
    emailVerified?: SortOrder
    image?: SortOrderInput | SortOrder
    createdAt?: SortOrder
    updatedAt?: SortOrder
    role?: SortOrder
    organization?: SortOrderInput | SortOrder
    country?: SortOrderInput | SortOrder
    sessions?: SessionOrderByRelationAggregateInput
    accounts?: AccountOrderByRelationAggregateInput
    decisions?: DecisionOrderByRelationAggregateInput
    auditDecisions?: AuditDecisionOrderByRelationAggregateInput
    crises?: CrisisOrderByRelationAggregateInput
  }

  export type UserWhereUniqueInput = Prisma.AtLeast<{
    id?: string
    email?: string
    AND?: UserWhereInput | UserWhereInput[]
    OR?: UserWhereInput[]
    NOT?: UserWhereInput | UserWhereInput[]
    name?: StringFilter<"User"> | string
    emailVerified?: BoolFilter<"User"> | boolean
    image?: StringNullableFilter<"User"> | string | null
    createdAt?: DateTimeFilter<"User"> | Date | string
    updatedAt?: DateTimeFilter<"User"> | Date | string
    role?: EnumUserRoleFilter<"User"> | $Enums.UserRole
    organization?: StringNullableFilter<"User"> | string | null
    country?: StringNullableFilter<"User"> | string | null
    sessions?: SessionListRelationFilter
    accounts?: AccountListRelationFilter
    decisions?: DecisionListRelationFilter
    auditDecisions?: AuditDecisionListRelationFilter
    crises?: CrisisListRelationFilter
  }, "id" | "email">

  export type UserOrderByWithAggregationInput = {
    id?: SortOrder
    name?: SortOrder
    email?: SortOrder
    emailVerified?: SortOrder
    image?: SortOrderInput | SortOrder
    createdAt?: SortOrder
    updatedAt?: SortOrder
    role?: SortOrder
    organization?: SortOrderInput | SortOrder
    country?: SortOrderInput | SortOrder
    _count?: UserCountOrderByAggregateInput
    _max?: UserMaxOrderByAggregateInput
    _min?: UserMinOrderByAggregateInput
  }

  export type UserScalarWhereWithAggregatesInput = {
    AND?: UserScalarWhereWithAggregatesInput | UserScalarWhereWithAggregatesInput[]
    OR?: UserScalarWhereWithAggregatesInput[]
    NOT?: UserScalarWhereWithAggregatesInput | UserScalarWhereWithAggregatesInput[]
    id?: StringWithAggregatesFilter<"User"> | string
    name?: StringWithAggregatesFilter<"User"> | string
    email?: StringWithAggregatesFilter<"User"> | string
    emailVerified?: BoolWithAggregatesFilter<"User"> | boolean
    image?: StringNullableWithAggregatesFilter<"User"> | string | null
    createdAt?: DateTimeWithAggregatesFilter<"User"> | Date | string
    updatedAt?: DateTimeWithAggregatesFilter<"User"> | Date | string
    role?: EnumUserRoleWithAggregatesFilter<"User"> | $Enums.UserRole
    organization?: StringNullableWithAggregatesFilter<"User"> | string | null
    country?: StringNullableWithAggregatesFilter<"User"> | string | null
  }

  export type SessionWhereInput = {
    AND?: SessionWhereInput | SessionWhereInput[]
    OR?: SessionWhereInput[]
    NOT?: SessionWhereInput | SessionWhereInput[]
    id?: StringFilter<"Session"> | string
    expiresAt?: DateTimeFilter<"Session"> | Date | string
    token?: StringFilter<"Session"> | string
    createdAt?: DateTimeFilter<"Session"> | Date | string
    updatedAt?: DateTimeFilter<"Session"> | Date | string
    ipAddress?: StringNullableFilter<"Session"> | string | null
    userAgent?: StringNullableFilter<"Session"> | string | null
    userId?: StringFilter<"Session"> | string
    user?: XOR<UserScalarRelationFilter, UserWhereInput>
  }

  export type SessionOrderByWithRelationInput = {
    id?: SortOrder
    expiresAt?: SortOrder
    token?: SortOrder
    createdAt?: SortOrder
    updatedAt?: SortOrder
    ipAddress?: SortOrderInput | SortOrder
    userAgent?: SortOrderInput | SortOrder
    userId?: SortOrder
    user?: UserOrderByWithRelationInput
  }

  export type SessionWhereUniqueInput = Prisma.AtLeast<{
    id?: string
    token?: string
    AND?: SessionWhereInput | SessionWhereInput[]
    OR?: SessionWhereInput[]
    NOT?: SessionWhereInput | SessionWhereInput[]
    expiresAt?: DateTimeFilter<"Session"> | Date | string
    createdAt?: DateTimeFilter<"Session"> | Date | string
    updatedAt?: DateTimeFilter<"Session"> | Date | string
    ipAddress?: StringNullableFilter<"Session"> | string | null
    userAgent?: StringNullableFilter<"Session"> | string | null
    userId?: StringFilter<"Session"> | string
    user?: XOR<UserScalarRelationFilter, UserWhereInput>
  }, "id" | "token">

  export type SessionOrderByWithAggregationInput = {
    id?: SortOrder
    expiresAt?: SortOrder
    token?: SortOrder
    createdAt?: SortOrder
    updatedAt?: SortOrder
    ipAddress?: SortOrderInput | SortOrder
    userAgent?: SortOrderInput | SortOrder
    userId?: SortOrder
    _count?: SessionCountOrderByAggregateInput
    _max?: SessionMaxOrderByAggregateInput
    _min?: SessionMinOrderByAggregateInput
  }

  export type SessionScalarWhereWithAggregatesInput = {
    AND?: SessionScalarWhereWithAggregatesInput | SessionScalarWhereWithAggregatesInput[]
    OR?: SessionScalarWhereWithAggregatesInput[]
    NOT?: SessionScalarWhereWithAggregatesInput | SessionScalarWhereWithAggregatesInput[]
    id?: StringWithAggregatesFilter<"Session"> | string
    expiresAt?: DateTimeWithAggregatesFilter<"Session"> | Date | string
    token?: StringWithAggregatesFilter<"Session"> | string
    createdAt?: DateTimeWithAggregatesFilter<"Session"> | Date | string
    updatedAt?: DateTimeWithAggregatesFilter<"Session"> | Date | string
    ipAddress?: StringNullableWithAggregatesFilter<"Session"> | string | null
    userAgent?: StringNullableWithAggregatesFilter<"Session"> | string | null
    userId?: StringWithAggregatesFilter<"Session"> | string
  }

  export type AccountWhereInput = {
    AND?: AccountWhereInput | AccountWhereInput[]
    OR?: AccountWhereInput[]
    NOT?: AccountWhereInput | AccountWhereInput[]
    id?: StringFilter<"Account"> | string
    accountId?: StringFilter<"Account"> | string
    providerId?: StringFilter<"Account"> | string
    userId?: StringFilter<"Account"> | string
    accessToken?: StringNullableFilter<"Account"> | string | null
    refreshToken?: StringNullableFilter<"Account"> | string | null
    idToken?: StringNullableFilter<"Account"> | string | null
    accessTokenExpiresAt?: DateTimeNullableFilter<"Account"> | Date | string | null
    refreshTokenExpiresAt?: DateTimeNullableFilter<"Account"> | Date | string | null
    scope?: StringNullableFilter<"Account"> | string | null
    password?: StringNullableFilter<"Account"> | string | null
    createdAt?: DateTimeFilter<"Account"> | Date | string
    updatedAt?: DateTimeFilter<"Account"> | Date | string
    user?: XOR<UserScalarRelationFilter, UserWhereInput>
  }

  export type AccountOrderByWithRelationInput = {
    id?: SortOrder
    accountId?: SortOrder
    providerId?: SortOrder
    userId?: SortOrder
    accessToken?: SortOrderInput | SortOrder
    refreshToken?: SortOrderInput | SortOrder
    idToken?: SortOrderInput | SortOrder
    accessTokenExpiresAt?: SortOrderInput | SortOrder
    refreshTokenExpiresAt?: SortOrderInput | SortOrder
    scope?: SortOrderInput | SortOrder
    password?: SortOrderInput | SortOrder
    createdAt?: SortOrder
    updatedAt?: SortOrder
    user?: UserOrderByWithRelationInput
  }

  export type AccountWhereUniqueInput = Prisma.AtLeast<{
    id?: string
    AND?: AccountWhereInput | AccountWhereInput[]
    OR?: AccountWhereInput[]
    NOT?: AccountWhereInput | AccountWhereInput[]
    accountId?: StringFilter<"Account"> | string
    providerId?: StringFilter<"Account"> | string
    userId?: StringFilter<"Account"> | string
    accessToken?: StringNullableFilter<"Account"> | string | null
    refreshToken?: StringNullableFilter<"Account"> | string | null
    idToken?: StringNullableFilter<"Account"> | string | null
    accessTokenExpiresAt?: DateTimeNullableFilter<"Account"> | Date | string | null
    refreshTokenExpiresAt?: DateTimeNullableFilter<"Account"> | Date | string | null
    scope?: StringNullableFilter<"Account"> | string | null
    password?: StringNullableFilter<"Account"> | string | null
    createdAt?: DateTimeFilter<"Account"> | Date | string
    updatedAt?: DateTimeFilter<"Account"> | Date | string
    user?: XOR<UserScalarRelationFilter, UserWhereInput>
  }, "id">

  export type AccountOrderByWithAggregationInput = {
    id?: SortOrder
    accountId?: SortOrder
    providerId?: SortOrder
    userId?: SortOrder
    accessToken?: SortOrderInput | SortOrder
    refreshToken?: SortOrderInput | SortOrder
    idToken?: SortOrderInput | SortOrder
    accessTokenExpiresAt?: SortOrderInput | SortOrder
    refreshTokenExpiresAt?: SortOrderInput | SortOrder
    scope?: SortOrderInput | SortOrder
    password?: SortOrderInput | SortOrder
    createdAt?: SortOrder
    updatedAt?: SortOrder
    _count?: AccountCountOrderByAggregateInput
    _max?: AccountMaxOrderByAggregateInput
    _min?: AccountMinOrderByAggregateInput
  }

  export type AccountScalarWhereWithAggregatesInput = {
    AND?: AccountScalarWhereWithAggregatesInput | AccountScalarWhereWithAggregatesInput[]
    OR?: AccountScalarWhereWithAggregatesInput[]
    NOT?: AccountScalarWhereWithAggregatesInput | AccountScalarWhereWithAggregatesInput[]
    id?: StringWithAggregatesFilter<"Account"> | string
    accountId?: StringWithAggregatesFilter<"Account"> | string
    providerId?: StringWithAggregatesFilter<"Account"> | string
    userId?: StringWithAggregatesFilter<"Account"> | string
    accessToken?: StringNullableWithAggregatesFilter<"Account"> | string | null
    refreshToken?: StringNullableWithAggregatesFilter<"Account"> | string | null
    idToken?: StringNullableWithAggregatesFilter<"Account"> | string | null
    accessTokenExpiresAt?: DateTimeNullableWithAggregatesFilter<"Account"> | Date | string | null
    refreshTokenExpiresAt?: DateTimeNullableWithAggregatesFilter<"Account"> | Date | string | null
    scope?: StringNullableWithAggregatesFilter<"Account"> | string | null
    password?: StringNullableWithAggregatesFilter<"Account"> | string | null
    createdAt?: DateTimeWithAggregatesFilter<"Account"> | Date | string
    updatedAt?: DateTimeWithAggregatesFilter<"Account"> | Date | string
  }

  export type VerificationWhereInput = {
    AND?: VerificationWhereInput | VerificationWhereInput[]
    OR?: VerificationWhereInput[]
    NOT?: VerificationWhereInput | VerificationWhereInput[]
    id?: StringFilter<"Verification"> | string
    identifier?: StringFilter<"Verification"> | string
    value?: StringFilter<"Verification"> | string
    expiresAt?: DateTimeFilter<"Verification"> | Date | string
    createdAt?: DateTimeFilter<"Verification"> | Date | string
    updatedAt?: DateTimeFilter<"Verification"> | Date | string
  }

  export type VerificationOrderByWithRelationInput = {
    id?: SortOrder
    identifier?: SortOrder
    value?: SortOrder
    expiresAt?: SortOrder
    createdAt?: SortOrder
    updatedAt?: SortOrder
  }

  export type VerificationWhereUniqueInput = Prisma.AtLeast<{
    id?: string
    AND?: VerificationWhereInput | VerificationWhereInput[]
    OR?: VerificationWhereInput[]
    NOT?: VerificationWhereInput | VerificationWhereInput[]
    identifier?: StringFilter<"Verification"> | string
    value?: StringFilter<"Verification"> | string
    expiresAt?: DateTimeFilter<"Verification"> | Date | string
    createdAt?: DateTimeFilter<"Verification"> | Date | string
    updatedAt?: DateTimeFilter<"Verification"> | Date | string
  }, "id">

  export type VerificationOrderByWithAggregationInput = {
    id?: SortOrder
    identifier?: SortOrder
    value?: SortOrder
    expiresAt?: SortOrder
    createdAt?: SortOrder
    updatedAt?: SortOrder
    _count?: VerificationCountOrderByAggregateInput
    _max?: VerificationMaxOrderByAggregateInput
    _min?: VerificationMinOrderByAggregateInput
  }

  export type VerificationScalarWhereWithAggregatesInput = {
    AND?: VerificationScalarWhereWithAggregatesInput | VerificationScalarWhereWithAggregatesInput[]
    OR?: VerificationScalarWhereWithAggregatesInput[]
    NOT?: VerificationScalarWhereWithAggregatesInput | VerificationScalarWhereWithAggregatesInput[]
    id?: StringWithAggregatesFilter<"Verification"> | string
    identifier?: StringWithAggregatesFilter<"Verification"> | string
    value?: StringWithAggregatesFilter<"Verification"> | string
    expiresAt?: DateTimeWithAggregatesFilter<"Verification"> | Date | string
    createdAt?: DateTimeWithAggregatesFilter<"Verification"> | Date | string
    updatedAt?: DateTimeWithAggregatesFilter<"Verification"> | Date | string
  }

  export type CrisisWhereInput = {
    AND?: CrisisWhereInput | CrisisWhereInput[]
    OR?: CrisisWhereInput[]
    NOT?: CrisisWhereInput | CrisisWhereInput[]
    id?: StringFilter<"Crisis"> | string
    title?: StringFilter<"Crisis"> | string
    type?: EnumCrisisTypeFilter<"Crisis"> | $Enums.CrisisType
    severity?: EnumCrisisSeverityFilter<"Crisis"> | $Enums.CrisisSeverity
    location?: StringFilter<"Crisis"> | string
    latitude?: FloatNullableFilter<"Crisis"> | number | null
    longitude?: FloatNullableFilter<"Crisis"> | number | null
    description?: StringNullableFilter<"Crisis"> | string | null
    affectedPopulation?: IntFilter<"Crisis"> | number
    status?: EnumCrisisStatusFilter<"Crisis"> | $Enums.CrisisStatus
    createdById?: StringFilter<"Crisis"> | string
    createdAt?: DateTimeFilter<"Crisis"> | Date | string
    updatedAt?: DateTimeFilter<"Crisis"> | Date | string
    createdBy?: XOR<UserScalarRelationFilter, UserWhereInput>
    decisions?: DecisionListRelationFilter
    alerts?: AlertListRelationFilter
  }

  export type CrisisOrderByWithRelationInput = {
    id?: SortOrder
    title?: SortOrder
    type?: SortOrder
    severity?: SortOrder
    location?: SortOrder
    latitude?: SortOrderInput | SortOrder
    longitude?: SortOrderInput | SortOrder
    description?: SortOrderInput | SortOrder
    affectedPopulation?: SortOrder
    status?: SortOrder
    createdById?: SortOrder
    createdAt?: SortOrder
    updatedAt?: SortOrder
    createdBy?: UserOrderByWithRelationInput
    decisions?: DecisionOrderByRelationAggregateInput
    alerts?: AlertOrderByRelationAggregateInput
  }

  export type CrisisWhereUniqueInput = Prisma.AtLeast<{
    id?: string
    AND?: CrisisWhereInput | CrisisWhereInput[]
    OR?: CrisisWhereInput[]
    NOT?: CrisisWhereInput | CrisisWhereInput[]
    title?: StringFilter<"Crisis"> | string
    type?: EnumCrisisTypeFilter<"Crisis"> | $Enums.CrisisType
    severity?: EnumCrisisSeverityFilter<"Crisis"> | $Enums.CrisisSeverity
    location?: StringFilter<"Crisis"> | string
    latitude?: FloatNullableFilter<"Crisis"> | number | null
    longitude?: FloatNullableFilter<"Crisis"> | number | null
    description?: StringNullableFilter<"Crisis"> | string | null
    affectedPopulation?: IntFilter<"Crisis"> | number
    status?: EnumCrisisStatusFilter<"Crisis"> | $Enums.CrisisStatus
    createdById?: StringFilter<"Crisis"> | string
    createdAt?: DateTimeFilter<"Crisis"> | Date | string
    updatedAt?: DateTimeFilter<"Crisis"> | Date | string
    createdBy?: XOR<UserScalarRelationFilter, UserWhereInput>
    decisions?: DecisionListRelationFilter
    alerts?: AlertListRelationFilter
  }, "id">

  export type CrisisOrderByWithAggregationInput = {
    id?: SortOrder
    title?: SortOrder
    type?: SortOrder
    severity?: SortOrder
    location?: SortOrder
    latitude?: SortOrderInput | SortOrder
    longitude?: SortOrderInput | SortOrder
    description?: SortOrderInput | SortOrder
    affectedPopulation?: SortOrder
    status?: SortOrder
    createdById?: SortOrder
    createdAt?: SortOrder
    updatedAt?: SortOrder
    _count?: CrisisCountOrderByAggregateInput
    _avg?: CrisisAvgOrderByAggregateInput
    _max?: CrisisMaxOrderByAggregateInput
    _min?: CrisisMinOrderByAggregateInput
    _sum?: CrisisSumOrderByAggregateInput
  }

  export type CrisisScalarWhereWithAggregatesInput = {
    AND?: CrisisScalarWhereWithAggregatesInput | CrisisScalarWhereWithAggregatesInput[]
    OR?: CrisisScalarWhereWithAggregatesInput[]
    NOT?: CrisisScalarWhereWithAggregatesInput | CrisisScalarWhereWithAggregatesInput[]
    id?: StringWithAggregatesFilter<"Crisis"> | string
    title?: StringWithAggregatesFilter<"Crisis"> | string
    type?: EnumCrisisTypeWithAggregatesFilter<"Crisis"> | $Enums.CrisisType
    severity?: EnumCrisisSeverityWithAggregatesFilter<"Crisis"> | $Enums.CrisisSeverity
    location?: StringWithAggregatesFilter<"Crisis"> | string
    latitude?: FloatNullableWithAggregatesFilter<"Crisis"> | number | null
    longitude?: FloatNullableWithAggregatesFilter<"Crisis"> | number | null
    description?: StringNullableWithAggregatesFilter<"Crisis"> | string | null
    affectedPopulation?: IntWithAggregatesFilter<"Crisis"> | number
    status?: EnumCrisisStatusWithAggregatesFilter<"Crisis"> | $Enums.CrisisStatus
    createdById?: StringWithAggregatesFilter<"Crisis"> | string
    createdAt?: DateTimeWithAggregatesFilter<"Crisis"> | Date | string
    updatedAt?: DateTimeWithAggregatesFilter<"Crisis"> | Date | string
  }

  export type DecisionWhereInput = {
    AND?: DecisionWhereInput | DecisionWhereInput[]
    OR?: DecisionWhereInput[]
    NOT?: DecisionWhereInput | DecisionWhereInput[]
    id?: StringFilter<"Decision"> | string
    crisisId?: StringFilter<"Decision"> | string
    title?: StringFilter<"Decision"> | string
    decisionText?: StringFilter<"Decision"> | string
    rationale?: StringNullableFilter<"Decision"> | string | null
    confidenceScore?: IntFilter<"Decision"> | number
    optionA?: StringNullableFilter<"Decision"> | string | null
    optionB?: StringNullableFilter<"Decision"> | string | null
    optionC?: StringNullableFilter<"Decision"> | string | null
    selectedOption?: EnumSelectedOptionFilter<"Decision"> | $Enums.SelectedOption
    outcome?: StringNullableFilter<"Decision"> | string | null
    madeById?: StringFilter<"Decision"> | string
    createdAt?: DateTimeFilter<"Decision"> | Date | string
    updatedAt?: DateTimeFilter<"Decision"> | Date | string
    crisis?: XOR<CrisisScalarRelationFilter, CrisisWhereInput>
    madeBy?: XOR<UserScalarRelationFilter, UserWhereInput>
  }

  export type DecisionOrderByWithRelationInput = {
    id?: SortOrder
    crisisId?: SortOrder
    title?: SortOrder
    decisionText?: SortOrder
    rationale?: SortOrderInput | SortOrder
    confidenceScore?: SortOrder
    optionA?: SortOrderInput | SortOrder
    optionB?: SortOrderInput | SortOrder
    optionC?: SortOrderInput | SortOrder
    selectedOption?: SortOrder
    outcome?: SortOrderInput | SortOrder
    madeById?: SortOrder
    createdAt?: SortOrder
    updatedAt?: SortOrder
    crisis?: CrisisOrderByWithRelationInput
    madeBy?: UserOrderByWithRelationInput
  }

  export type DecisionWhereUniqueInput = Prisma.AtLeast<{
    id?: string
    AND?: DecisionWhereInput | DecisionWhereInput[]
    OR?: DecisionWhereInput[]
    NOT?: DecisionWhereInput | DecisionWhereInput[]
    crisisId?: StringFilter<"Decision"> | string
    title?: StringFilter<"Decision"> | string
    decisionText?: StringFilter<"Decision"> | string
    rationale?: StringNullableFilter<"Decision"> | string | null
    confidenceScore?: IntFilter<"Decision"> | number
    optionA?: StringNullableFilter<"Decision"> | string | null
    optionB?: StringNullableFilter<"Decision"> | string | null
    optionC?: StringNullableFilter<"Decision"> | string | null
    selectedOption?: EnumSelectedOptionFilter<"Decision"> | $Enums.SelectedOption
    outcome?: StringNullableFilter<"Decision"> | string | null
    madeById?: StringFilter<"Decision"> | string
    createdAt?: DateTimeFilter<"Decision"> | Date | string
    updatedAt?: DateTimeFilter<"Decision"> | Date | string
    crisis?: XOR<CrisisScalarRelationFilter, CrisisWhereInput>
    madeBy?: XOR<UserScalarRelationFilter, UserWhereInput>
  }, "id">

  export type DecisionOrderByWithAggregationInput = {
    id?: SortOrder
    crisisId?: SortOrder
    title?: SortOrder
    decisionText?: SortOrder
    rationale?: SortOrderInput | SortOrder
    confidenceScore?: SortOrder
    optionA?: SortOrderInput | SortOrder
    optionB?: SortOrderInput | SortOrder
    optionC?: SortOrderInput | SortOrder
    selectedOption?: SortOrder
    outcome?: SortOrderInput | SortOrder
    madeById?: SortOrder
    createdAt?: SortOrder
    updatedAt?: SortOrder
    _count?: DecisionCountOrderByAggregateInput
    _avg?: DecisionAvgOrderByAggregateInput
    _max?: DecisionMaxOrderByAggregateInput
    _min?: DecisionMinOrderByAggregateInput
    _sum?: DecisionSumOrderByAggregateInput
  }

  export type DecisionScalarWhereWithAggregatesInput = {
    AND?: DecisionScalarWhereWithAggregatesInput | DecisionScalarWhereWithAggregatesInput[]
    OR?: DecisionScalarWhereWithAggregatesInput[]
    NOT?: DecisionScalarWhereWithAggregatesInput | DecisionScalarWhereWithAggregatesInput[]
    id?: StringWithAggregatesFilter<"Decision"> | string
    crisisId?: StringWithAggregatesFilter<"Decision"> | string
    title?: StringWithAggregatesFilter<"Decision"> | string
    decisionText?: StringWithAggregatesFilter<"Decision"> | string
    rationale?: StringNullableWithAggregatesFilter<"Decision"> | string | null
    confidenceScore?: IntWithAggregatesFilter<"Decision"> | number
    optionA?: StringNullableWithAggregatesFilter<"Decision"> | string | null
    optionB?: StringNullableWithAggregatesFilter<"Decision"> | string | null
    optionC?: StringNullableWithAggregatesFilter<"Decision"> | string | null
    selectedOption?: EnumSelectedOptionWithAggregatesFilter<"Decision"> | $Enums.SelectedOption
    outcome?: StringNullableWithAggregatesFilter<"Decision"> | string | null
    madeById?: StringWithAggregatesFilter<"Decision"> | string
    createdAt?: DateTimeWithAggregatesFilter<"Decision"> | Date | string
    updatedAt?: DateTimeWithAggregatesFilter<"Decision"> | Date | string
  }

  export type AlertWhereInput = {
    AND?: AlertWhereInput | AlertWhereInput[]
    OR?: AlertWhereInput[]
    NOT?: AlertWhereInput | AlertWhereInput[]
    id?: StringFilter<"Alert"> | string
    crisisId?: StringFilter<"Alert"> | string
    type?: EnumAlertTypeFilter<"Alert"> | $Enums.AlertType
    severity?: EnumAlertSeverityFilter<"Alert"> | $Enums.AlertSeverity
    message?: StringFilter<"Alert"> | string
    isActive?: BoolFilter<"Alert"> | boolean
    triggeredAt?: DateTimeFilter<"Alert"> | Date | string
    resolvedAt?: DateTimeNullableFilter<"Alert"> | Date | string | null
    crisis?: XOR<CrisisScalarRelationFilter, CrisisWhereInput>
  }

  export type AlertOrderByWithRelationInput = {
    id?: SortOrder
    crisisId?: SortOrder
    type?: SortOrder
    severity?: SortOrder
    message?: SortOrder
    isActive?: SortOrder
    triggeredAt?: SortOrder
    resolvedAt?: SortOrderInput | SortOrder
    crisis?: CrisisOrderByWithRelationInput
  }

  export type AlertWhereUniqueInput = Prisma.AtLeast<{
    id?: string
    AND?: AlertWhereInput | AlertWhereInput[]
    OR?: AlertWhereInput[]
    NOT?: AlertWhereInput | AlertWhereInput[]
    crisisId?: StringFilter<"Alert"> | string
    type?: EnumAlertTypeFilter<"Alert"> | $Enums.AlertType
    severity?: EnumAlertSeverityFilter<"Alert"> | $Enums.AlertSeverity
    message?: StringFilter<"Alert"> | string
    isActive?: BoolFilter<"Alert"> | boolean
    triggeredAt?: DateTimeFilter<"Alert"> | Date | string
    resolvedAt?: DateTimeNullableFilter<"Alert"> | Date | string | null
    crisis?: XOR<CrisisScalarRelationFilter, CrisisWhereInput>
  }, "id">

  export type AlertOrderByWithAggregationInput = {
    id?: SortOrder
    crisisId?: SortOrder
    type?: SortOrder
    severity?: SortOrder
    message?: SortOrder
    isActive?: SortOrder
    triggeredAt?: SortOrder
    resolvedAt?: SortOrderInput | SortOrder
    _count?: AlertCountOrderByAggregateInput
    _max?: AlertMaxOrderByAggregateInput
    _min?: AlertMinOrderByAggregateInput
  }

  export type AlertScalarWhereWithAggregatesInput = {
    AND?: AlertScalarWhereWithAggregatesInput | AlertScalarWhereWithAggregatesInput[]
    OR?: AlertScalarWhereWithAggregatesInput[]
    NOT?: AlertScalarWhereWithAggregatesInput | AlertScalarWhereWithAggregatesInput[]
    id?: StringWithAggregatesFilter<"Alert"> | string
    crisisId?: StringWithAggregatesFilter<"Alert"> | string
    type?: EnumAlertTypeWithAggregatesFilter<"Alert"> | $Enums.AlertType
    severity?: EnumAlertSeverityWithAggregatesFilter<"Alert"> | $Enums.AlertSeverity
    message?: StringWithAggregatesFilter<"Alert"> | string
    isActive?: BoolWithAggregatesFilter<"Alert"> | boolean
    triggeredAt?: DateTimeWithAggregatesFilter<"Alert"> | Date | string
    resolvedAt?: DateTimeNullableWithAggregatesFilter<"Alert"> | Date | string | null
  }

  export type AuditDecisionWhereInput = {
    AND?: AuditDecisionWhereInput | AuditDecisionWhereInput[]
    OR?: AuditDecisionWhereInput[]
    NOT?: AuditDecisionWhereInput | AuditDecisionWhereInput[]
    id?: StringFilter<"AuditDecision"> | string
    title?: StringFilter<"AuditDecision"> | string
    type?: EnumAuditDecisionTypeFilter<"AuditDecision"> | $Enums.AuditDecisionType
    decisionMade?: StringFilter<"AuditDecision"> | string
    rationale?: StringFilter<"AuditDecision"> | string
    riskLevel?: EnumRiskLevelFilter<"AuditDecision"> | $Enums.RiskLevel
    informationSources?: JsonFilter<"AuditDecision">
    stakeholders?: JsonFilter<"AuditDecision">
    alternatives?: StringNullableFilter<"AuditDecision"> | string | null
    locationLat?: FloatNullableFilter<"AuditDecision"> | number | null
    locationLng?: FloatNullableFilter<"AuditDecision"> | number | null
    locationAddress?: StringNullableFilter<"AuditDecision"> | string | null
    deviceId?: StringFilter<"AuditDecision"> | string
    status?: EnumAuditStatusFilter<"AuditDecision"> | $Enums.AuditStatus
    syncStatus?: EnumSyncStatusFilter<"AuditDecision"> | $Enums.SyncStatus
    tags?: JsonFilter<"AuditDecision">
    priority?: EnumPriorityFilter<"AuditDecision"> | $Enums.Priority
    cryptoHash?: StringNullableFilter<"AuditDecision"> | string | null
    createdById?: StringFilter<"AuditDecision"> | string
    createdAt?: DateTimeFilter<"AuditDecision"> | Date | string
    updatedAt?: DateTimeFilter<"AuditDecision"> | Date | string
    createdBy?: XOR<UserScalarRelationFilter, UserWhereInput>
    evidence?: EvidenceListRelationFilter
  }

  export type AuditDecisionOrderByWithRelationInput = {
    id?: SortOrder
    title?: SortOrder
    type?: SortOrder
    decisionMade?: SortOrder
    rationale?: SortOrder
    riskLevel?: SortOrder
    informationSources?: SortOrder
    stakeholders?: SortOrder
    alternatives?: SortOrderInput | SortOrder
    locationLat?: SortOrderInput | SortOrder
    locationLng?: SortOrderInput | SortOrder
    locationAddress?: SortOrderInput | SortOrder
    deviceId?: SortOrder
    status?: SortOrder
    syncStatus?: SortOrder
    tags?: SortOrder
    priority?: SortOrder
    cryptoHash?: SortOrderInput | SortOrder
    createdById?: SortOrder
    createdAt?: SortOrder
    updatedAt?: SortOrder
    createdBy?: UserOrderByWithRelationInput
    evidence?: EvidenceOrderByRelationAggregateInput
  }

  export type AuditDecisionWhereUniqueInput = Prisma.AtLeast<{
    id?: string
    AND?: AuditDecisionWhereInput | AuditDecisionWhereInput[]
    OR?: AuditDecisionWhereInput[]
    NOT?: AuditDecisionWhereInput | AuditDecisionWhereInput[]
    title?: StringFilter<"AuditDecision"> | string
    type?: EnumAuditDecisionTypeFilter<"AuditDecision"> | $Enums.AuditDecisionType
    decisionMade?: StringFilter<"AuditDecision"> | string
    rationale?: StringFilter<"AuditDecision"> | string
    riskLevel?: EnumRiskLevelFilter<"AuditDecision"> | $Enums.RiskLevel
    informationSources?: JsonFilter<"AuditDecision">
    stakeholders?: JsonFilter<"AuditDecision">
    alternatives?: StringNullableFilter<"AuditDecision"> | string | null
    locationLat?: FloatNullableFilter<"AuditDecision"> | number | null
    locationLng?: FloatNullableFilter<"AuditDecision"> | number | null
    locationAddress?: StringNullableFilter<"AuditDecision"> | string | null
    deviceId?: StringFilter<"AuditDecision"> | string
    status?: EnumAuditStatusFilter<"AuditDecision"> | $Enums.AuditStatus
    syncStatus?: EnumSyncStatusFilter<"AuditDecision"> | $Enums.SyncStatus
    tags?: JsonFilter<"AuditDecision">
    priority?: EnumPriorityFilter<"AuditDecision"> | $Enums.Priority
    cryptoHash?: StringNullableFilter<"AuditDecision"> | string | null
    createdById?: StringFilter<"AuditDecision"> | string
    createdAt?: DateTimeFilter<"AuditDecision"> | Date | string
    updatedAt?: DateTimeFilter<"AuditDecision"> | Date | string
    createdBy?: XOR<UserScalarRelationFilter, UserWhereInput>
    evidence?: EvidenceListRelationFilter
  }, "id">

  export type AuditDecisionOrderByWithAggregationInput = {
    id?: SortOrder
    title?: SortOrder
    type?: SortOrder
    decisionMade?: SortOrder
    rationale?: SortOrder
    riskLevel?: SortOrder
    informationSources?: SortOrder
    stakeholders?: SortOrder
    alternatives?: SortOrderInput | SortOrder
    locationLat?: SortOrderInput | SortOrder
    locationLng?: SortOrderInput | SortOrder
    locationAddress?: SortOrderInput | SortOrder
    deviceId?: SortOrder
    status?: SortOrder
    syncStatus?: SortOrder
    tags?: SortOrder
    priority?: SortOrder
    cryptoHash?: SortOrderInput | SortOrder
    createdById?: SortOrder
    createdAt?: SortOrder
    updatedAt?: SortOrder
    _count?: AuditDecisionCountOrderByAggregateInput
    _avg?: AuditDecisionAvgOrderByAggregateInput
    _max?: AuditDecisionMaxOrderByAggregateInput
    _min?: AuditDecisionMinOrderByAggregateInput
    _sum?: AuditDecisionSumOrderByAggregateInput
  }

  export type AuditDecisionScalarWhereWithAggregatesInput = {
    AND?: AuditDecisionScalarWhereWithAggregatesInput | AuditDecisionScalarWhereWithAggregatesInput[]
    OR?: AuditDecisionScalarWhereWithAggregatesInput[]
    NOT?: AuditDecisionScalarWhereWithAggregatesInput | AuditDecisionScalarWhereWithAggregatesInput[]
    id?: StringWithAggregatesFilter<"AuditDecision"> | string
    title?: StringWithAggregatesFilter<"AuditDecision"> | string
    type?: EnumAuditDecisionTypeWithAggregatesFilter<"AuditDecision"> | $Enums.AuditDecisionType
    decisionMade?: StringWithAggregatesFilter<"AuditDecision"> | string
    rationale?: StringWithAggregatesFilter<"AuditDecision"> | string
    riskLevel?: EnumRiskLevelWithAggregatesFilter<"AuditDecision"> | $Enums.RiskLevel
    informationSources?: JsonWithAggregatesFilter<"AuditDecision">
    stakeholders?: JsonWithAggregatesFilter<"AuditDecision">
    alternatives?: StringNullableWithAggregatesFilter<"AuditDecision"> | string | null
    locationLat?: FloatNullableWithAggregatesFilter<"AuditDecision"> | number | null
    locationLng?: FloatNullableWithAggregatesFilter<"AuditDecision"> | number | null
    locationAddress?: StringNullableWithAggregatesFilter<"AuditDecision"> | string | null
    deviceId?: StringWithAggregatesFilter<"AuditDecision"> | string
    status?: EnumAuditStatusWithAggregatesFilter<"AuditDecision"> | $Enums.AuditStatus
    syncStatus?: EnumSyncStatusWithAggregatesFilter<"AuditDecision"> | $Enums.SyncStatus
    tags?: JsonWithAggregatesFilter<"AuditDecision">
    priority?: EnumPriorityWithAggregatesFilter<"AuditDecision"> | $Enums.Priority
    cryptoHash?: StringNullableWithAggregatesFilter<"AuditDecision"> | string | null
    createdById?: StringWithAggregatesFilter<"AuditDecision"> | string
    createdAt?: DateTimeWithAggregatesFilter<"AuditDecision"> | Date | string
    updatedAt?: DateTimeWithAggregatesFilter<"AuditDecision"> | Date | string
  }

  export type EvidenceWhereInput = {
    AND?: EvidenceWhereInput | EvidenceWhereInput[]
    OR?: EvidenceWhereInput[]
    NOT?: EvidenceWhereInput | EvidenceWhereInput[]
    id?: StringFilter<"Evidence"> | string
    auditDecisionId?: StringFilter<"Evidence"> | string
    type?: EnumEvidenceTypeFilter<"Evidence"> | $Enums.EvidenceType
    filename?: StringFilter<"Evidence"> | string
    size?: IntFilter<"Evidence"> | number
    hash?: StringNullableFilter<"Evidence"> | string | null
    metadata?: JsonNullableFilter<"Evidence">
    createdAt?: DateTimeFilter<"Evidence"> | Date | string
    auditDecision?: XOR<AuditDecisionScalarRelationFilter, AuditDecisionWhereInput>
  }

  export type EvidenceOrderByWithRelationInput = {
    id?: SortOrder
    auditDecisionId?: SortOrder
    type?: SortOrder
    filename?: SortOrder
    size?: SortOrder
    hash?: SortOrderInput | SortOrder
    metadata?: SortOrderInput | SortOrder
    createdAt?: SortOrder
    auditDecision?: AuditDecisionOrderByWithRelationInput
  }

  export type EvidenceWhereUniqueInput = Prisma.AtLeast<{
    id?: string
    AND?: EvidenceWhereInput | EvidenceWhereInput[]
    OR?: EvidenceWhereInput[]
    NOT?: EvidenceWhereInput | EvidenceWhereInput[]
    auditDecisionId?: StringFilter<"Evidence"> | string
    type?: EnumEvidenceTypeFilter<"Evidence"> | $Enums.EvidenceType
    filename?: StringFilter<"Evidence"> | string
    size?: IntFilter<"Evidence"> | number
    hash?: StringNullableFilter<"Evidence"> | string | null
    metadata?: JsonNullableFilter<"Evidence">
    createdAt?: DateTimeFilter<"Evidence"> | Date | string
    auditDecision?: XOR<AuditDecisionScalarRelationFilter, AuditDecisionWhereInput>
  }, "id">

  export type EvidenceOrderByWithAggregationInput = {
    id?: SortOrder
    auditDecisionId?: SortOrder
    type?: SortOrder
    filename?: SortOrder
    size?: SortOrder
    hash?: SortOrderInput | SortOrder
    metadata?: SortOrderInput | SortOrder
    createdAt?: SortOrder
    _count?: EvidenceCountOrderByAggregateInput
    _avg?: EvidenceAvgOrderByAggregateInput
    _max?: EvidenceMaxOrderByAggregateInput
    _min?: EvidenceMinOrderByAggregateInput
    _sum?: EvidenceSumOrderByAggregateInput
  }

  export type EvidenceScalarWhereWithAggregatesInput = {
    AND?: EvidenceScalarWhereWithAggregatesInput | EvidenceScalarWhereWithAggregatesInput[]
    OR?: EvidenceScalarWhereWithAggregatesInput[]
    NOT?: EvidenceScalarWhereWithAggregatesInput | EvidenceScalarWhereWithAggregatesInput[]
    id?: StringWithAggregatesFilter<"Evidence"> | string
    auditDecisionId?: StringWithAggregatesFilter<"Evidence"> | string
    type?: EnumEvidenceTypeWithAggregatesFilter<"Evidence"> | $Enums.EvidenceType
    filename?: StringWithAggregatesFilter<"Evidence"> | string
    size?: IntWithAggregatesFilter<"Evidence"> | number
    hash?: StringNullableWithAggregatesFilter<"Evidence"> | string | null
    metadata?: JsonNullableWithAggregatesFilter<"Evidence">
    createdAt?: DateTimeWithAggregatesFilter<"Evidence"> | Date | string
  }

  export type UserCreateInput = {
    id: string
    name: string
    email: string
    emailVerified?: boolean
    image?: string | null
    createdAt?: Date | string
    updatedAt?: Date | string
    role?: $Enums.UserRole
    organization?: string | null
    country?: string | null
    sessions?: SessionCreateNestedManyWithoutUserInput
    accounts?: AccountCreateNestedManyWithoutUserInput
    decisions?: DecisionCreateNestedManyWithoutMadeByInput
    auditDecisions?: AuditDecisionCreateNestedManyWithoutCreatedByInput
    crises?: CrisisCreateNestedManyWithoutCreatedByInput
  }

  export type UserUncheckedCreateInput = {
    id: string
    name: string
    email: string
    emailVerified?: boolean
    image?: string | null
    createdAt?: Date | string
    updatedAt?: Date | string
    role?: $Enums.UserRole
    organization?: string | null
    country?: string | null
    sessions?: SessionUncheckedCreateNestedManyWithoutUserInput
    accounts?: AccountUncheckedCreateNestedManyWithoutUserInput
    decisions?: DecisionUncheckedCreateNestedManyWithoutMadeByInput
    auditDecisions?: AuditDecisionUncheckedCreateNestedManyWithoutCreatedByInput
    crises?: CrisisUncheckedCreateNestedManyWithoutCreatedByInput
  }

  export type UserUpdateInput = {
    id?: StringFieldUpdateOperationsInput | string
    name?: StringFieldUpdateOperationsInput | string
    email?: StringFieldUpdateOperationsInput | string
    emailVerified?: BoolFieldUpdateOperationsInput | boolean
    image?: NullableStringFieldUpdateOperationsInput | string | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    role?: EnumUserRoleFieldUpdateOperationsInput | $Enums.UserRole
    organization?: NullableStringFieldUpdateOperationsInput | string | null
    country?: NullableStringFieldUpdateOperationsInput | string | null
    sessions?: SessionUpdateManyWithoutUserNestedInput
    accounts?: AccountUpdateManyWithoutUserNestedInput
    decisions?: DecisionUpdateManyWithoutMadeByNestedInput
    auditDecisions?: AuditDecisionUpdateManyWithoutCreatedByNestedInput
    crises?: CrisisUpdateManyWithoutCreatedByNestedInput
  }

  export type UserUncheckedUpdateInput = {
    id?: StringFieldUpdateOperationsInput | string
    name?: StringFieldUpdateOperationsInput | string
    email?: StringFieldUpdateOperationsInput | string
    emailVerified?: BoolFieldUpdateOperationsInput | boolean
    image?: NullableStringFieldUpdateOperationsInput | string | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    role?: EnumUserRoleFieldUpdateOperationsInput | $Enums.UserRole
    organization?: NullableStringFieldUpdateOperationsInput | string | null
    country?: NullableStringFieldUpdateOperationsInput | string | null
    sessions?: SessionUncheckedUpdateManyWithoutUserNestedInput
    accounts?: AccountUncheckedUpdateManyWithoutUserNestedInput
    decisions?: DecisionUncheckedUpdateManyWithoutMadeByNestedInput
    auditDecisions?: AuditDecisionUncheckedUpdateManyWithoutCreatedByNestedInput
    crises?: CrisisUncheckedUpdateManyWithoutCreatedByNestedInput
  }

  export type UserCreateManyInput = {
    id: string
    name: string
    email: string
    emailVerified?: boolean
    image?: string | null
    createdAt?: Date | string
    updatedAt?: Date | string
    role?: $Enums.UserRole
    organization?: string | null
    country?: string | null
  }

  export type UserUpdateManyMutationInput = {
    id?: StringFieldUpdateOperationsInput | string
    name?: StringFieldUpdateOperationsInput | string
    email?: StringFieldUpdateOperationsInput | string
    emailVerified?: BoolFieldUpdateOperationsInput | boolean
    image?: NullableStringFieldUpdateOperationsInput | string | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    role?: EnumUserRoleFieldUpdateOperationsInput | $Enums.UserRole
    organization?: NullableStringFieldUpdateOperationsInput | string | null
    country?: NullableStringFieldUpdateOperationsInput | string | null
  }

  export type UserUncheckedUpdateManyInput = {
    id?: StringFieldUpdateOperationsInput | string
    name?: StringFieldUpdateOperationsInput | string
    email?: StringFieldUpdateOperationsInput | string
    emailVerified?: BoolFieldUpdateOperationsInput | boolean
    image?: NullableStringFieldUpdateOperationsInput | string | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    role?: EnumUserRoleFieldUpdateOperationsInput | $Enums.UserRole
    organization?: NullableStringFieldUpdateOperationsInput | string | null
    country?: NullableStringFieldUpdateOperationsInput | string | null
  }

  export type SessionCreateInput = {
    id: string
    expiresAt: Date | string
    token: string
    createdAt?: Date | string
    updatedAt?: Date | string
    ipAddress?: string | null
    userAgent?: string | null
    user: UserCreateNestedOneWithoutSessionsInput
  }

  export type SessionUncheckedCreateInput = {
    id: string
    expiresAt: Date | string
    token: string
    createdAt?: Date | string
    updatedAt?: Date | string
    ipAddress?: string | null
    userAgent?: string | null
    userId: string
  }

  export type SessionUpdateInput = {
    id?: StringFieldUpdateOperationsInput | string
    expiresAt?: DateTimeFieldUpdateOperationsInput | Date | string
    token?: StringFieldUpdateOperationsInput | string
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    ipAddress?: NullableStringFieldUpdateOperationsInput | string | null
    userAgent?: NullableStringFieldUpdateOperationsInput | string | null
    user?: UserUpdateOneRequiredWithoutSessionsNestedInput
  }

  export type SessionUncheckedUpdateInput = {
    id?: StringFieldUpdateOperationsInput | string
    expiresAt?: DateTimeFieldUpdateOperationsInput | Date | string
    token?: StringFieldUpdateOperationsInput | string
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    ipAddress?: NullableStringFieldUpdateOperationsInput | string | null
    userAgent?: NullableStringFieldUpdateOperationsInput | string | null
    userId?: StringFieldUpdateOperationsInput | string
  }

  export type SessionCreateManyInput = {
    id: string
    expiresAt: Date | string
    token: string
    createdAt?: Date | string
    updatedAt?: Date | string
    ipAddress?: string | null
    userAgent?: string | null
    userId: string
  }

  export type SessionUpdateManyMutationInput = {
    id?: StringFieldUpdateOperationsInput | string
    expiresAt?: DateTimeFieldUpdateOperationsInput | Date | string
    token?: StringFieldUpdateOperationsInput | string
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    ipAddress?: NullableStringFieldUpdateOperationsInput | string | null
    userAgent?: NullableStringFieldUpdateOperationsInput | string | null
  }

  export type SessionUncheckedUpdateManyInput = {
    id?: StringFieldUpdateOperationsInput | string
    expiresAt?: DateTimeFieldUpdateOperationsInput | Date | string
    token?: StringFieldUpdateOperationsInput | string
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    ipAddress?: NullableStringFieldUpdateOperationsInput | string | null
    userAgent?: NullableStringFieldUpdateOperationsInput | string | null
    userId?: StringFieldUpdateOperationsInput | string
  }

  export type AccountCreateInput = {
    id: string
    accountId: string
    providerId: string
    accessToken?: string | null
    refreshToken?: string | null
    idToken?: string | null
    accessTokenExpiresAt?: Date | string | null
    refreshTokenExpiresAt?: Date | string | null
    scope?: string | null
    password?: string | null
    createdAt?: Date | string
    updatedAt?: Date | string
    user: UserCreateNestedOneWithoutAccountsInput
  }

  export type AccountUncheckedCreateInput = {
    id: string
    accountId: string
    providerId: string
    userId: string
    accessToken?: string | null
    refreshToken?: string | null
    idToken?: string | null
    accessTokenExpiresAt?: Date | string | null
    refreshTokenExpiresAt?: Date | string | null
    scope?: string | null
    password?: string | null
    createdAt?: Date | string
    updatedAt?: Date | string
  }

  export type AccountUpdateInput = {
    id?: StringFieldUpdateOperationsInput | string
    accountId?: StringFieldUpdateOperationsInput | string
    providerId?: StringFieldUpdateOperationsInput | string
    accessToken?: NullableStringFieldUpdateOperationsInput | string | null
    refreshToken?: NullableStringFieldUpdateOperationsInput | string | null
    idToken?: NullableStringFieldUpdateOperationsInput | string | null
    accessTokenExpiresAt?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    refreshTokenExpiresAt?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    scope?: NullableStringFieldUpdateOperationsInput | string | null
    password?: NullableStringFieldUpdateOperationsInput | string | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    user?: UserUpdateOneRequiredWithoutAccountsNestedInput
  }

  export type AccountUncheckedUpdateInput = {
    id?: StringFieldUpdateOperationsInput | string
    accountId?: StringFieldUpdateOperationsInput | string
    providerId?: StringFieldUpdateOperationsInput | string
    userId?: StringFieldUpdateOperationsInput | string
    accessToken?: NullableStringFieldUpdateOperationsInput | string | null
    refreshToken?: NullableStringFieldUpdateOperationsInput | string | null
    idToken?: NullableStringFieldUpdateOperationsInput | string | null
    accessTokenExpiresAt?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    refreshTokenExpiresAt?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    scope?: NullableStringFieldUpdateOperationsInput | string | null
    password?: NullableStringFieldUpdateOperationsInput | string | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type AccountCreateManyInput = {
    id: string
    accountId: string
    providerId: string
    userId: string
    accessToken?: string | null
    refreshToken?: string | null
    idToken?: string | null
    accessTokenExpiresAt?: Date | string | null
    refreshTokenExpiresAt?: Date | string | null
    scope?: string | null
    password?: string | null
    createdAt?: Date | string
    updatedAt?: Date | string
  }

  export type AccountUpdateManyMutationInput = {
    id?: StringFieldUpdateOperationsInput | string
    accountId?: StringFieldUpdateOperationsInput | string
    providerId?: StringFieldUpdateOperationsInput | string
    accessToken?: NullableStringFieldUpdateOperationsInput | string | null
    refreshToken?: NullableStringFieldUpdateOperationsInput | string | null
    idToken?: NullableStringFieldUpdateOperationsInput | string | null
    accessTokenExpiresAt?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    refreshTokenExpiresAt?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    scope?: NullableStringFieldUpdateOperationsInput | string | null
    password?: NullableStringFieldUpdateOperationsInput | string | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type AccountUncheckedUpdateManyInput = {
    id?: StringFieldUpdateOperationsInput | string
    accountId?: StringFieldUpdateOperationsInput | string
    providerId?: StringFieldUpdateOperationsInput | string
    userId?: StringFieldUpdateOperationsInput | string
    accessToken?: NullableStringFieldUpdateOperationsInput | string | null
    refreshToken?: NullableStringFieldUpdateOperationsInput | string | null
    idToken?: NullableStringFieldUpdateOperationsInput | string | null
    accessTokenExpiresAt?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    refreshTokenExpiresAt?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    scope?: NullableStringFieldUpdateOperationsInput | string | null
    password?: NullableStringFieldUpdateOperationsInput | string | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type VerificationCreateInput = {
    id: string
    identifier: string
    value: string
    expiresAt: Date | string
    createdAt?: Date | string
    updatedAt?: Date | string
  }

  export type VerificationUncheckedCreateInput = {
    id: string
    identifier: string
    value: string
    expiresAt: Date | string
    createdAt?: Date | string
    updatedAt?: Date | string
  }

  export type VerificationUpdateInput = {
    id?: StringFieldUpdateOperationsInput | string
    identifier?: StringFieldUpdateOperationsInput | string
    value?: StringFieldUpdateOperationsInput | string
    expiresAt?: DateTimeFieldUpdateOperationsInput | Date | string
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type VerificationUncheckedUpdateInput = {
    id?: StringFieldUpdateOperationsInput | string
    identifier?: StringFieldUpdateOperationsInput | string
    value?: StringFieldUpdateOperationsInput | string
    expiresAt?: DateTimeFieldUpdateOperationsInput | Date | string
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type VerificationCreateManyInput = {
    id: string
    identifier: string
    value: string
    expiresAt: Date | string
    createdAt?: Date | string
    updatedAt?: Date | string
  }

  export type VerificationUpdateManyMutationInput = {
    id?: StringFieldUpdateOperationsInput | string
    identifier?: StringFieldUpdateOperationsInput | string
    value?: StringFieldUpdateOperationsInput | string
    expiresAt?: DateTimeFieldUpdateOperationsInput | Date | string
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type VerificationUncheckedUpdateManyInput = {
    id?: StringFieldUpdateOperationsInput | string
    identifier?: StringFieldUpdateOperationsInput | string
    value?: StringFieldUpdateOperationsInput | string
    expiresAt?: DateTimeFieldUpdateOperationsInput | Date | string
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type CrisisCreateInput = {
    id?: string
    title: string
    type: $Enums.CrisisType
    severity: $Enums.CrisisSeverity
    location: string
    latitude?: number | null
    longitude?: number | null
    description?: string | null
    affectedPopulation?: number
    status?: $Enums.CrisisStatus
    createdAt?: Date | string
    updatedAt?: Date | string
    createdBy: UserCreateNestedOneWithoutCrisesInput
    decisions?: DecisionCreateNestedManyWithoutCrisisInput
    alerts?: AlertCreateNestedManyWithoutCrisisInput
  }

  export type CrisisUncheckedCreateInput = {
    id?: string
    title: string
    type: $Enums.CrisisType
    severity: $Enums.CrisisSeverity
    location: string
    latitude?: number | null
    longitude?: number | null
    description?: string | null
    affectedPopulation?: number
    status?: $Enums.CrisisStatus
    createdById: string
    createdAt?: Date | string
    updatedAt?: Date | string
    decisions?: DecisionUncheckedCreateNestedManyWithoutCrisisInput
    alerts?: AlertUncheckedCreateNestedManyWithoutCrisisInput
  }

  export type CrisisUpdateInput = {
    id?: StringFieldUpdateOperationsInput | string
    title?: StringFieldUpdateOperationsInput | string
    type?: EnumCrisisTypeFieldUpdateOperationsInput | $Enums.CrisisType
    severity?: EnumCrisisSeverityFieldUpdateOperationsInput | $Enums.CrisisSeverity
    location?: StringFieldUpdateOperationsInput | string
    latitude?: NullableFloatFieldUpdateOperationsInput | number | null
    longitude?: NullableFloatFieldUpdateOperationsInput | number | null
    description?: NullableStringFieldUpdateOperationsInput | string | null
    affectedPopulation?: IntFieldUpdateOperationsInput | number
    status?: EnumCrisisStatusFieldUpdateOperationsInput | $Enums.CrisisStatus
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    createdBy?: UserUpdateOneRequiredWithoutCrisesNestedInput
    decisions?: DecisionUpdateManyWithoutCrisisNestedInput
    alerts?: AlertUpdateManyWithoutCrisisNestedInput
  }

  export type CrisisUncheckedUpdateInput = {
    id?: StringFieldUpdateOperationsInput | string
    title?: StringFieldUpdateOperationsInput | string
    type?: EnumCrisisTypeFieldUpdateOperationsInput | $Enums.CrisisType
    severity?: EnumCrisisSeverityFieldUpdateOperationsInput | $Enums.CrisisSeverity
    location?: StringFieldUpdateOperationsInput | string
    latitude?: NullableFloatFieldUpdateOperationsInput | number | null
    longitude?: NullableFloatFieldUpdateOperationsInput | number | null
    description?: NullableStringFieldUpdateOperationsInput | string | null
    affectedPopulation?: IntFieldUpdateOperationsInput | number
    status?: EnumCrisisStatusFieldUpdateOperationsInput | $Enums.CrisisStatus
    createdById?: StringFieldUpdateOperationsInput | string
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    decisions?: DecisionUncheckedUpdateManyWithoutCrisisNestedInput
    alerts?: AlertUncheckedUpdateManyWithoutCrisisNestedInput
  }

  export type CrisisCreateManyInput = {
    id?: string
    title: string
    type: $Enums.CrisisType
    severity: $Enums.CrisisSeverity
    location: string
    latitude?: number | null
    longitude?: number | null
    description?: string | null
    affectedPopulation?: number
    status?: $Enums.CrisisStatus
    createdById: string
    createdAt?: Date | string
    updatedAt?: Date | string
  }

  export type CrisisUpdateManyMutationInput = {
    id?: StringFieldUpdateOperationsInput | string
    title?: StringFieldUpdateOperationsInput | string
    type?: EnumCrisisTypeFieldUpdateOperationsInput | $Enums.CrisisType
    severity?: EnumCrisisSeverityFieldUpdateOperationsInput | $Enums.CrisisSeverity
    location?: StringFieldUpdateOperationsInput | string
    latitude?: NullableFloatFieldUpdateOperationsInput | number | null
    longitude?: NullableFloatFieldUpdateOperationsInput | number | null
    description?: NullableStringFieldUpdateOperationsInput | string | null
    affectedPopulation?: IntFieldUpdateOperationsInput | number
    status?: EnumCrisisStatusFieldUpdateOperationsInput | $Enums.CrisisStatus
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type CrisisUncheckedUpdateManyInput = {
    id?: StringFieldUpdateOperationsInput | string
    title?: StringFieldUpdateOperationsInput | string
    type?: EnumCrisisTypeFieldUpdateOperationsInput | $Enums.CrisisType
    severity?: EnumCrisisSeverityFieldUpdateOperationsInput | $Enums.CrisisSeverity
    location?: StringFieldUpdateOperationsInput | string
    latitude?: NullableFloatFieldUpdateOperationsInput | number | null
    longitude?: NullableFloatFieldUpdateOperationsInput | number | null
    description?: NullableStringFieldUpdateOperationsInput | string | null
    affectedPopulation?: IntFieldUpdateOperationsInput | number
    status?: EnumCrisisStatusFieldUpdateOperationsInput | $Enums.CrisisStatus
    createdById?: StringFieldUpdateOperationsInput | string
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type DecisionCreateInput = {
    id?: string
    title: string
    decisionText: string
    rationale?: string | null
    confidenceScore?: number
    optionA?: string | null
    optionB?: string | null
    optionC?: string | null
    selectedOption: $Enums.SelectedOption
    outcome?: string | null
    createdAt?: Date | string
    updatedAt?: Date | string
    crisis: CrisisCreateNestedOneWithoutDecisionsInput
    madeBy: UserCreateNestedOneWithoutDecisionsInput
  }

  export type DecisionUncheckedCreateInput = {
    id?: string
    crisisId: string
    title: string
    decisionText: string
    rationale?: string | null
    confidenceScore?: number
    optionA?: string | null
    optionB?: string | null
    optionC?: string | null
    selectedOption: $Enums.SelectedOption
    outcome?: string | null
    madeById: string
    createdAt?: Date | string
    updatedAt?: Date | string
  }

  export type DecisionUpdateInput = {
    id?: StringFieldUpdateOperationsInput | string
    title?: StringFieldUpdateOperationsInput | string
    decisionText?: StringFieldUpdateOperationsInput | string
    rationale?: NullableStringFieldUpdateOperationsInput | string | null
    confidenceScore?: IntFieldUpdateOperationsInput | number
    optionA?: NullableStringFieldUpdateOperationsInput | string | null
    optionB?: NullableStringFieldUpdateOperationsInput | string | null
    optionC?: NullableStringFieldUpdateOperationsInput | string | null
    selectedOption?: EnumSelectedOptionFieldUpdateOperationsInput | $Enums.SelectedOption
    outcome?: NullableStringFieldUpdateOperationsInput | string | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    crisis?: CrisisUpdateOneRequiredWithoutDecisionsNestedInput
    madeBy?: UserUpdateOneRequiredWithoutDecisionsNestedInput
  }

  export type DecisionUncheckedUpdateInput = {
    id?: StringFieldUpdateOperationsInput | string
    crisisId?: StringFieldUpdateOperationsInput | string
    title?: StringFieldUpdateOperationsInput | string
    decisionText?: StringFieldUpdateOperationsInput | string
    rationale?: NullableStringFieldUpdateOperationsInput | string | null
    confidenceScore?: IntFieldUpdateOperationsInput | number
    optionA?: NullableStringFieldUpdateOperationsInput | string | null
    optionB?: NullableStringFieldUpdateOperationsInput | string | null
    optionC?: NullableStringFieldUpdateOperationsInput | string | null
    selectedOption?: EnumSelectedOptionFieldUpdateOperationsInput | $Enums.SelectedOption
    outcome?: NullableStringFieldUpdateOperationsInput | string | null
    madeById?: StringFieldUpdateOperationsInput | string
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type DecisionCreateManyInput = {
    id?: string
    crisisId: string
    title: string
    decisionText: string
    rationale?: string | null
    confidenceScore?: number
    optionA?: string | null
    optionB?: string | null
    optionC?: string | null
    selectedOption: $Enums.SelectedOption
    outcome?: string | null
    madeById: string
    createdAt?: Date | string
    updatedAt?: Date | string
  }

  export type DecisionUpdateManyMutationInput = {
    id?: StringFieldUpdateOperationsInput | string
    title?: StringFieldUpdateOperationsInput | string
    decisionText?: StringFieldUpdateOperationsInput | string
    rationale?: NullableStringFieldUpdateOperationsInput | string | null
    confidenceScore?: IntFieldUpdateOperationsInput | number
    optionA?: NullableStringFieldUpdateOperationsInput | string | null
    optionB?: NullableStringFieldUpdateOperationsInput | string | null
    optionC?: NullableStringFieldUpdateOperationsInput | string | null
    selectedOption?: EnumSelectedOptionFieldUpdateOperationsInput | $Enums.SelectedOption
    outcome?: NullableStringFieldUpdateOperationsInput | string | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type DecisionUncheckedUpdateManyInput = {
    id?: StringFieldUpdateOperationsInput | string
    crisisId?: StringFieldUpdateOperationsInput | string
    title?: StringFieldUpdateOperationsInput | string
    decisionText?: StringFieldUpdateOperationsInput | string
    rationale?: NullableStringFieldUpdateOperationsInput | string | null
    confidenceScore?: IntFieldUpdateOperationsInput | number
    optionA?: NullableStringFieldUpdateOperationsInput | string | null
    optionB?: NullableStringFieldUpdateOperationsInput | string | null
    optionC?: NullableStringFieldUpdateOperationsInput | string | null
    selectedOption?: EnumSelectedOptionFieldUpdateOperationsInput | $Enums.SelectedOption
    outcome?: NullableStringFieldUpdateOperationsInput | string | null
    madeById?: StringFieldUpdateOperationsInput | string
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type AlertCreateInput = {
    id?: string
    type: $Enums.AlertType
    severity: $Enums.AlertSeverity
    message: string
    isActive?: boolean
    triggeredAt?: Date | string
    resolvedAt?: Date | string | null
    crisis: CrisisCreateNestedOneWithoutAlertsInput
  }

  export type AlertUncheckedCreateInput = {
    id?: string
    crisisId: string
    type: $Enums.AlertType
    severity: $Enums.AlertSeverity
    message: string
    isActive?: boolean
    triggeredAt?: Date | string
    resolvedAt?: Date | string | null
  }

  export type AlertUpdateInput = {
    id?: StringFieldUpdateOperationsInput | string
    type?: EnumAlertTypeFieldUpdateOperationsInput | $Enums.AlertType
    severity?: EnumAlertSeverityFieldUpdateOperationsInput | $Enums.AlertSeverity
    message?: StringFieldUpdateOperationsInput | string
    isActive?: BoolFieldUpdateOperationsInput | boolean
    triggeredAt?: DateTimeFieldUpdateOperationsInput | Date | string
    resolvedAt?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    crisis?: CrisisUpdateOneRequiredWithoutAlertsNestedInput
  }

  export type AlertUncheckedUpdateInput = {
    id?: StringFieldUpdateOperationsInput | string
    crisisId?: StringFieldUpdateOperationsInput | string
    type?: EnumAlertTypeFieldUpdateOperationsInput | $Enums.AlertType
    severity?: EnumAlertSeverityFieldUpdateOperationsInput | $Enums.AlertSeverity
    message?: StringFieldUpdateOperationsInput | string
    isActive?: BoolFieldUpdateOperationsInput | boolean
    triggeredAt?: DateTimeFieldUpdateOperationsInput | Date | string
    resolvedAt?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
  }

  export type AlertCreateManyInput = {
    id?: string
    crisisId: string
    type: $Enums.AlertType
    severity: $Enums.AlertSeverity
    message: string
    isActive?: boolean
    triggeredAt?: Date | string
    resolvedAt?: Date | string | null
  }

  export type AlertUpdateManyMutationInput = {
    id?: StringFieldUpdateOperationsInput | string
    type?: EnumAlertTypeFieldUpdateOperationsInput | $Enums.AlertType
    severity?: EnumAlertSeverityFieldUpdateOperationsInput | $Enums.AlertSeverity
    message?: StringFieldUpdateOperationsInput | string
    isActive?: BoolFieldUpdateOperationsInput | boolean
    triggeredAt?: DateTimeFieldUpdateOperationsInput | Date | string
    resolvedAt?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
  }

  export type AlertUncheckedUpdateManyInput = {
    id?: StringFieldUpdateOperationsInput | string
    crisisId?: StringFieldUpdateOperationsInput | string
    type?: EnumAlertTypeFieldUpdateOperationsInput | $Enums.AlertType
    severity?: EnumAlertSeverityFieldUpdateOperationsInput | $Enums.AlertSeverity
    message?: StringFieldUpdateOperationsInput | string
    isActive?: BoolFieldUpdateOperationsInput | boolean
    triggeredAt?: DateTimeFieldUpdateOperationsInput | Date | string
    resolvedAt?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
  }

  export type AuditDecisionCreateInput = {
    id?: string
    title: string
    type: $Enums.AuditDecisionType
    decisionMade: string
    rationale: string
    riskLevel: $Enums.RiskLevel
    informationSources: JsonNullValueInput | InputJsonValue
    stakeholders: JsonNullValueInput | InputJsonValue
    alternatives?: string | null
    locationLat?: number | null
    locationLng?: number | null
    locationAddress?: string | null
    deviceId?: string
    status?: $Enums.AuditStatus
    syncStatus?: $Enums.SyncStatus
    tags?: JsonNullValueInput | InputJsonValue
    priority?: $Enums.Priority
    cryptoHash?: string | null
    createdAt?: Date | string
    updatedAt?: Date | string
    createdBy: UserCreateNestedOneWithoutAuditDecisionsInput
    evidence?: EvidenceCreateNestedManyWithoutAuditDecisionInput
  }

  export type AuditDecisionUncheckedCreateInput = {
    id?: string
    title: string
    type: $Enums.AuditDecisionType
    decisionMade: string
    rationale: string
    riskLevel: $Enums.RiskLevel
    informationSources: JsonNullValueInput | InputJsonValue
    stakeholders: JsonNullValueInput | InputJsonValue
    alternatives?: string | null
    locationLat?: number | null
    locationLng?: number | null
    locationAddress?: string | null
    deviceId?: string
    status?: $Enums.AuditStatus
    syncStatus?: $Enums.SyncStatus
    tags?: JsonNullValueInput | InputJsonValue
    priority?: $Enums.Priority
    cryptoHash?: string | null
    createdById: string
    createdAt?: Date | string
    updatedAt?: Date | string
    evidence?: EvidenceUncheckedCreateNestedManyWithoutAuditDecisionInput
  }

  export type AuditDecisionUpdateInput = {
    id?: StringFieldUpdateOperationsInput | string
    title?: StringFieldUpdateOperationsInput | string
    type?: EnumAuditDecisionTypeFieldUpdateOperationsInput | $Enums.AuditDecisionType
    decisionMade?: StringFieldUpdateOperationsInput | string
    rationale?: StringFieldUpdateOperationsInput | string
    riskLevel?: EnumRiskLevelFieldUpdateOperationsInput | $Enums.RiskLevel
    informationSources?: JsonNullValueInput | InputJsonValue
    stakeholders?: JsonNullValueInput | InputJsonValue
    alternatives?: NullableStringFieldUpdateOperationsInput | string | null
    locationLat?: NullableFloatFieldUpdateOperationsInput | number | null
    locationLng?: NullableFloatFieldUpdateOperationsInput | number | null
    locationAddress?: NullableStringFieldUpdateOperationsInput | string | null
    deviceId?: StringFieldUpdateOperationsInput | string
    status?: EnumAuditStatusFieldUpdateOperationsInput | $Enums.AuditStatus
    syncStatus?: EnumSyncStatusFieldUpdateOperationsInput | $Enums.SyncStatus
    tags?: JsonNullValueInput | InputJsonValue
    priority?: EnumPriorityFieldUpdateOperationsInput | $Enums.Priority
    cryptoHash?: NullableStringFieldUpdateOperationsInput | string | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    createdBy?: UserUpdateOneRequiredWithoutAuditDecisionsNestedInput
    evidence?: EvidenceUpdateManyWithoutAuditDecisionNestedInput
  }

  export type AuditDecisionUncheckedUpdateInput = {
    id?: StringFieldUpdateOperationsInput | string
    title?: StringFieldUpdateOperationsInput | string
    type?: EnumAuditDecisionTypeFieldUpdateOperationsInput | $Enums.AuditDecisionType
    decisionMade?: StringFieldUpdateOperationsInput | string
    rationale?: StringFieldUpdateOperationsInput | string
    riskLevel?: EnumRiskLevelFieldUpdateOperationsInput | $Enums.RiskLevel
    informationSources?: JsonNullValueInput | InputJsonValue
    stakeholders?: JsonNullValueInput | InputJsonValue
    alternatives?: NullableStringFieldUpdateOperationsInput | string | null
    locationLat?: NullableFloatFieldUpdateOperationsInput | number | null
    locationLng?: NullableFloatFieldUpdateOperationsInput | number | null
    locationAddress?: NullableStringFieldUpdateOperationsInput | string | null
    deviceId?: StringFieldUpdateOperationsInput | string
    status?: EnumAuditStatusFieldUpdateOperationsInput | $Enums.AuditStatus
    syncStatus?: EnumSyncStatusFieldUpdateOperationsInput | $Enums.SyncStatus
    tags?: JsonNullValueInput | InputJsonValue
    priority?: EnumPriorityFieldUpdateOperationsInput | $Enums.Priority
    cryptoHash?: NullableStringFieldUpdateOperationsInput | string | null
    createdById?: StringFieldUpdateOperationsInput | string
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    evidence?: EvidenceUncheckedUpdateManyWithoutAuditDecisionNestedInput
  }

  export type AuditDecisionCreateManyInput = {
    id?: string
    title: string
    type: $Enums.AuditDecisionType
    decisionMade: string
    rationale: string
    riskLevel: $Enums.RiskLevel
    informationSources: JsonNullValueInput | InputJsonValue
    stakeholders: JsonNullValueInput | InputJsonValue
    alternatives?: string | null
    locationLat?: number | null
    locationLng?: number | null
    locationAddress?: string | null
    deviceId?: string
    status?: $Enums.AuditStatus
    syncStatus?: $Enums.SyncStatus
    tags?: JsonNullValueInput | InputJsonValue
    priority?: $Enums.Priority
    cryptoHash?: string | null
    createdById: string
    createdAt?: Date | string
    updatedAt?: Date | string
  }

  export type AuditDecisionUpdateManyMutationInput = {
    id?: StringFieldUpdateOperationsInput | string
    title?: StringFieldUpdateOperationsInput | string
    type?: EnumAuditDecisionTypeFieldUpdateOperationsInput | $Enums.AuditDecisionType
    decisionMade?: StringFieldUpdateOperationsInput | string
    rationale?: StringFieldUpdateOperationsInput | string
    riskLevel?: EnumRiskLevelFieldUpdateOperationsInput | $Enums.RiskLevel
    informationSources?: JsonNullValueInput | InputJsonValue
    stakeholders?: JsonNullValueInput | InputJsonValue
    alternatives?: NullableStringFieldUpdateOperationsInput | string | null
    locationLat?: NullableFloatFieldUpdateOperationsInput | number | null
    locationLng?: NullableFloatFieldUpdateOperationsInput | number | null
    locationAddress?: NullableStringFieldUpdateOperationsInput | string | null
    deviceId?: StringFieldUpdateOperationsInput | string
    status?: EnumAuditStatusFieldUpdateOperationsInput | $Enums.AuditStatus
    syncStatus?: EnumSyncStatusFieldUpdateOperationsInput | $Enums.SyncStatus
    tags?: JsonNullValueInput | InputJsonValue
    priority?: EnumPriorityFieldUpdateOperationsInput | $Enums.Priority
    cryptoHash?: NullableStringFieldUpdateOperationsInput | string | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type AuditDecisionUncheckedUpdateManyInput = {
    id?: StringFieldUpdateOperationsInput | string
    title?: StringFieldUpdateOperationsInput | string
    type?: EnumAuditDecisionTypeFieldUpdateOperationsInput | $Enums.AuditDecisionType
    decisionMade?: StringFieldUpdateOperationsInput | string
    rationale?: StringFieldUpdateOperationsInput | string
    riskLevel?: EnumRiskLevelFieldUpdateOperationsInput | $Enums.RiskLevel
    informationSources?: JsonNullValueInput | InputJsonValue
    stakeholders?: JsonNullValueInput | InputJsonValue
    alternatives?: NullableStringFieldUpdateOperationsInput | string | null
    locationLat?: NullableFloatFieldUpdateOperationsInput | number | null
    locationLng?: NullableFloatFieldUpdateOperationsInput | number | null
    locationAddress?: NullableStringFieldUpdateOperationsInput | string | null
    deviceId?: StringFieldUpdateOperationsInput | string
    status?: EnumAuditStatusFieldUpdateOperationsInput | $Enums.AuditStatus
    syncStatus?: EnumSyncStatusFieldUpdateOperationsInput | $Enums.SyncStatus
    tags?: JsonNullValueInput | InputJsonValue
    priority?: EnumPriorityFieldUpdateOperationsInput | $Enums.Priority
    cryptoHash?: NullableStringFieldUpdateOperationsInput | string | null
    createdById?: StringFieldUpdateOperationsInput | string
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type EvidenceCreateInput = {
    id?: string
    type: $Enums.EvidenceType
    filename: string
    size: number
    hash?: string | null
    metadata?: NullableJsonNullValueInput | InputJsonValue
    createdAt?: Date | string
    auditDecision: AuditDecisionCreateNestedOneWithoutEvidenceInput
  }

  export type EvidenceUncheckedCreateInput = {
    id?: string
    auditDecisionId: string
    type: $Enums.EvidenceType
    filename: string
    size: number
    hash?: string | null
    metadata?: NullableJsonNullValueInput | InputJsonValue
    createdAt?: Date | string
  }

  export type EvidenceUpdateInput = {
    id?: StringFieldUpdateOperationsInput | string
    type?: EnumEvidenceTypeFieldUpdateOperationsInput | $Enums.EvidenceType
    filename?: StringFieldUpdateOperationsInput | string
    size?: IntFieldUpdateOperationsInput | number
    hash?: NullableStringFieldUpdateOperationsInput | string | null
    metadata?: NullableJsonNullValueInput | InputJsonValue
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    auditDecision?: AuditDecisionUpdateOneRequiredWithoutEvidenceNestedInput
  }

  export type EvidenceUncheckedUpdateInput = {
    id?: StringFieldUpdateOperationsInput | string
    auditDecisionId?: StringFieldUpdateOperationsInput | string
    type?: EnumEvidenceTypeFieldUpdateOperationsInput | $Enums.EvidenceType
    filename?: StringFieldUpdateOperationsInput | string
    size?: IntFieldUpdateOperationsInput | number
    hash?: NullableStringFieldUpdateOperationsInput | string | null
    metadata?: NullableJsonNullValueInput | InputJsonValue
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type EvidenceCreateManyInput = {
    id?: string
    auditDecisionId: string
    type: $Enums.EvidenceType
    filename: string
    size: number
    hash?: string | null
    metadata?: NullableJsonNullValueInput | InputJsonValue
    createdAt?: Date | string
  }

  export type EvidenceUpdateManyMutationInput = {
    id?: StringFieldUpdateOperationsInput | string
    type?: EnumEvidenceTypeFieldUpdateOperationsInput | $Enums.EvidenceType
    filename?: StringFieldUpdateOperationsInput | string
    size?: IntFieldUpdateOperationsInput | number
    hash?: NullableStringFieldUpdateOperationsInput | string | null
    metadata?: NullableJsonNullValueInput | InputJsonValue
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type EvidenceUncheckedUpdateManyInput = {
    id?: StringFieldUpdateOperationsInput | string
    auditDecisionId?: StringFieldUpdateOperationsInput | string
    type?: EnumEvidenceTypeFieldUpdateOperationsInput | $Enums.EvidenceType
    filename?: StringFieldUpdateOperationsInput | string
    size?: IntFieldUpdateOperationsInput | number
    hash?: NullableStringFieldUpdateOperationsInput | string | null
    metadata?: NullableJsonNullValueInput | InputJsonValue
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type StringFilter<$PrismaModel = never> = {
    equals?: string | StringFieldRefInput<$PrismaModel>
    in?: string[] | ListStringFieldRefInput<$PrismaModel>
    notIn?: string[] | ListStringFieldRefInput<$PrismaModel>
    lt?: string | StringFieldRefInput<$PrismaModel>
    lte?: string | StringFieldRefInput<$PrismaModel>
    gt?: string | StringFieldRefInput<$PrismaModel>
    gte?: string | StringFieldRefInput<$PrismaModel>
    contains?: string | StringFieldRefInput<$PrismaModel>
    startsWith?: string | StringFieldRefInput<$PrismaModel>
    endsWith?: string | StringFieldRefInput<$PrismaModel>
    mode?: QueryMode
    not?: NestedStringFilter<$PrismaModel> | string
  }

  export type BoolFilter<$PrismaModel = never> = {
    equals?: boolean | BooleanFieldRefInput<$PrismaModel>
    not?: NestedBoolFilter<$PrismaModel> | boolean
  }

  export type StringNullableFilter<$PrismaModel = never> = {
    equals?: string | StringFieldRefInput<$PrismaModel> | null
    in?: string[] | ListStringFieldRefInput<$PrismaModel> | null
    notIn?: string[] | ListStringFieldRefInput<$PrismaModel> | null
    lt?: string | StringFieldRefInput<$PrismaModel>
    lte?: string | StringFieldRefInput<$PrismaModel>
    gt?: string | StringFieldRefInput<$PrismaModel>
    gte?: string | StringFieldRefInput<$PrismaModel>
    contains?: string | StringFieldRefInput<$PrismaModel>
    startsWith?: string | StringFieldRefInput<$PrismaModel>
    endsWith?: string | StringFieldRefInput<$PrismaModel>
    mode?: QueryMode
    not?: NestedStringNullableFilter<$PrismaModel> | string | null
  }

  export type DateTimeFilter<$PrismaModel = never> = {
    equals?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    in?: Date[] | string[] | ListDateTimeFieldRefInput<$PrismaModel>
    notIn?: Date[] | string[] | ListDateTimeFieldRefInput<$PrismaModel>
    lt?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    lte?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    gt?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    gte?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    not?: NestedDateTimeFilter<$PrismaModel> | Date | string
  }

  export type EnumUserRoleFilter<$PrismaModel = never> = {
    equals?: $Enums.UserRole | EnumUserRoleFieldRefInput<$PrismaModel>
    in?: $Enums.UserRole[] | ListEnumUserRoleFieldRefInput<$PrismaModel>
    notIn?: $Enums.UserRole[] | ListEnumUserRoleFieldRefInput<$PrismaModel>
    not?: NestedEnumUserRoleFilter<$PrismaModel> | $Enums.UserRole
  }

  export type SessionListRelationFilter = {
    every?: SessionWhereInput
    some?: SessionWhereInput
    none?: SessionWhereInput
  }

  export type AccountListRelationFilter = {
    every?: AccountWhereInput
    some?: AccountWhereInput
    none?: AccountWhereInput
  }

  export type DecisionListRelationFilter = {
    every?: DecisionWhereInput
    some?: DecisionWhereInput
    none?: DecisionWhereInput
  }

  export type AuditDecisionListRelationFilter = {
    every?: AuditDecisionWhereInput
    some?: AuditDecisionWhereInput
    none?: AuditDecisionWhereInput
  }

  export type CrisisListRelationFilter = {
    every?: CrisisWhereInput
    some?: CrisisWhereInput
    none?: CrisisWhereInput
  }

  export type SortOrderInput = {
    sort: SortOrder
    nulls?: NullsOrder
  }

  export type SessionOrderByRelationAggregateInput = {
    _count?: SortOrder
  }

  export type AccountOrderByRelationAggregateInput = {
    _count?: SortOrder
  }

  export type DecisionOrderByRelationAggregateInput = {
    _count?: SortOrder
  }

  export type AuditDecisionOrderByRelationAggregateInput = {
    _count?: SortOrder
  }

  export type CrisisOrderByRelationAggregateInput = {
    _count?: SortOrder
  }

  export type UserCountOrderByAggregateInput = {
    id?: SortOrder
    name?: SortOrder
    email?: SortOrder
    emailVerified?: SortOrder
    image?: SortOrder
    createdAt?: SortOrder
    updatedAt?: SortOrder
    role?: SortOrder
    organization?: SortOrder
    country?: SortOrder
  }

  export type UserMaxOrderByAggregateInput = {
    id?: SortOrder
    name?: SortOrder
    email?: SortOrder
    emailVerified?: SortOrder
    image?: SortOrder
    createdAt?: SortOrder
    updatedAt?: SortOrder
    role?: SortOrder
    organization?: SortOrder
    country?: SortOrder
  }

  export type UserMinOrderByAggregateInput = {
    id?: SortOrder
    name?: SortOrder
    email?: SortOrder
    emailVerified?: SortOrder
    image?: SortOrder
    createdAt?: SortOrder
    updatedAt?: SortOrder
    role?: SortOrder
    organization?: SortOrder
    country?: SortOrder
  }

  export type StringWithAggregatesFilter<$PrismaModel = never> = {
    equals?: string | StringFieldRefInput<$PrismaModel>
    in?: string[] | ListStringFieldRefInput<$PrismaModel>
    notIn?: string[] | ListStringFieldRefInput<$PrismaModel>
    lt?: string | StringFieldRefInput<$PrismaModel>
    lte?: string | StringFieldRefInput<$PrismaModel>
    gt?: string | StringFieldRefInput<$PrismaModel>
    gte?: string | StringFieldRefInput<$PrismaModel>
    contains?: string | StringFieldRefInput<$PrismaModel>
    startsWith?: string | StringFieldRefInput<$PrismaModel>
    endsWith?: string | StringFieldRefInput<$PrismaModel>
    mode?: QueryMode
    not?: NestedStringWithAggregatesFilter<$PrismaModel> | string
    _count?: NestedIntFilter<$PrismaModel>
    _min?: NestedStringFilter<$PrismaModel>
    _max?: NestedStringFilter<$PrismaModel>
  }

  export type BoolWithAggregatesFilter<$PrismaModel = never> = {
    equals?: boolean | BooleanFieldRefInput<$PrismaModel>
    not?: NestedBoolWithAggregatesFilter<$PrismaModel> | boolean
    _count?: NestedIntFilter<$PrismaModel>
    _min?: NestedBoolFilter<$PrismaModel>
    _max?: NestedBoolFilter<$PrismaModel>
  }

  export type StringNullableWithAggregatesFilter<$PrismaModel = never> = {
    equals?: string | StringFieldRefInput<$PrismaModel> | null
    in?: string[] | ListStringFieldRefInput<$PrismaModel> | null
    notIn?: string[] | ListStringFieldRefInput<$PrismaModel> | null
    lt?: string | StringFieldRefInput<$PrismaModel>
    lte?: string | StringFieldRefInput<$PrismaModel>
    gt?: string | StringFieldRefInput<$PrismaModel>
    gte?: string | StringFieldRefInput<$PrismaModel>
    contains?: string | StringFieldRefInput<$PrismaModel>
    startsWith?: string | StringFieldRefInput<$PrismaModel>
    endsWith?: string | StringFieldRefInput<$PrismaModel>
    mode?: QueryMode
    not?: NestedStringNullableWithAggregatesFilter<$PrismaModel> | string | null
    _count?: NestedIntNullableFilter<$PrismaModel>
    _min?: NestedStringNullableFilter<$PrismaModel>
    _max?: NestedStringNullableFilter<$PrismaModel>
  }

  export type DateTimeWithAggregatesFilter<$PrismaModel = never> = {
    equals?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    in?: Date[] | string[] | ListDateTimeFieldRefInput<$PrismaModel>
    notIn?: Date[] | string[] | ListDateTimeFieldRefInput<$PrismaModel>
    lt?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    lte?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    gt?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    gte?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    not?: NestedDateTimeWithAggregatesFilter<$PrismaModel> | Date | string
    _count?: NestedIntFilter<$PrismaModel>
    _min?: NestedDateTimeFilter<$PrismaModel>
    _max?: NestedDateTimeFilter<$PrismaModel>
  }

  export type EnumUserRoleWithAggregatesFilter<$PrismaModel = never> = {
    equals?: $Enums.UserRole | EnumUserRoleFieldRefInput<$PrismaModel>
    in?: $Enums.UserRole[] | ListEnumUserRoleFieldRefInput<$PrismaModel>
    notIn?: $Enums.UserRole[] | ListEnumUserRoleFieldRefInput<$PrismaModel>
    not?: NestedEnumUserRoleWithAggregatesFilter<$PrismaModel> | $Enums.UserRole
    _count?: NestedIntFilter<$PrismaModel>
    _min?: NestedEnumUserRoleFilter<$PrismaModel>
    _max?: NestedEnumUserRoleFilter<$PrismaModel>
  }

  export type UserScalarRelationFilter = {
    is?: UserWhereInput
    isNot?: UserWhereInput
  }

  export type SessionCountOrderByAggregateInput = {
    id?: SortOrder
    expiresAt?: SortOrder
    token?: SortOrder
    createdAt?: SortOrder
    updatedAt?: SortOrder
    ipAddress?: SortOrder
    userAgent?: SortOrder
    userId?: SortOrder
  }

  export type SessionMaxOrderByAggregateInput = {
    id?: SortOrder
    expiresAt?: SortOrder
    token?: SortOrder
    createdAt?: SortOrder
    updatedAt?: SortOrder
    ipAddress?: SortOrder
    userAgent?: SortOrder
    userId?: SortOrder
  }

  export type SessionMinOrderByAggregateInput = {
    id?: SortOrder
    expiresAt?: SortOrder
    token?: SortOrder
    createdAt?: SortOrder
    updatedAt?: SortOrder
    ipAddress?: SortOrder
    userAgent?: SortOrder
    userId?: SortOrder
  }

  export type DateTimeNullableFilter<$PrismaModel = never> = {
    equals?: Date | string | DateTimeFieldRefInput<$PrismaModel> | null
    in?: Date[] | string[] | ListDateTimeFieldRefInput<$PrismaModel> | null
    notIn?: Date[] | string[] | ListDateTimeFieldRefInput<$PrismaModel> | null
    lt?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    lte?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    gt?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    gte?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    not?: NestedDateTimeNullableFilter<$PrismaModel> | Date | string | null
  }

  export type AccountCountOrderByAggregateInput = {
    id?: SortOrder
    accountId?: SortOrder
    providerId?: SortOrder
    userId?: SortOrder
    accessToken?: SortOrder
    refreshToken?: SortOrder
    idToken?: SortOrder
    accessTokenExpiresAt?: SortOrder
    refreshTokenExpiresAt?: SortOrder
    scope?: SortOrder
    password?: SortOrder
    createdAt?: SortOrder
    updatedAt?: SortOrder
  }

  export type AccountMaxOrderByAggregateInput = {
    id?: SortOrder
    accountId?: SortOrder
    providerId?: SortOrder
    userId?: SortOrder
    accessToken?: SortOrder
    refreshToken?: SortOrder
    idToken?: SortOrder
    accessTokenExpiresAt?: SortOrder
    refreshTokenExpiresAt?: SortOrder
    scope?: SortOrder
    password?: SortOrder
    createdAt?: SortOrder
    updatedAt?: SortOrder
  }

  export type AccountMinOrderByAggregateInput = {
    id?: SortOrder
    accountId?: SortOrder
    providerId?: SortOrder
    userId?: SortOrder
    accessToken?: SortOrder
    refreshToken?: SortOrder
    idToken?: SortOrder
    accessTokenExpiresAt?: SortOrder
    refreshTokenExpiresAt?: SortOrder
    scope?: SortOrder
    password?: SortOrder
    createdAt?: SortOrder
    updatedAt?: SortOrder
  }

  export type DateTimeNullableWithAggregatesFilter<$PrismaModel = never> = {
    equals?: Date | string | DateTimeFieldRefInput<$PrismaModel> | null
    in?: Date[] | string[] | ListDateTimeFieldRefInput<$PrismaModel> | null
    notIn?: Date[] | string[] | ListDateTimeFieldRefInput<$PrismaModel> | null
    lt?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    lte?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    gt?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    gte?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    not?: NestedDateTimeNullableWithAggregatesFilter<$PrismaModel> | Date | string | null
    _count?: NestedIntNullableFilter<$PrismaModel>
    _min?: NestedDateTimeNullableFilter<$PrismaModel>
    _max?: NestedDateTimeNullableFilter<$PrismaModel>
  }

  export type VerificationCountOrderByAggregateInput = {
    id?: SortOrder
    identifier?: SortOrder
    value?: SortOrder
    expiresAt?: SortOrder
    createdAt?: SortOrder
    updatedAt?: SortOrder
  }

  export type VerificationMaxOrderByAggregateInput = {
    id?: SortOrder
    identifier?: SortOrder
    value?: SortOrder
    expiresAt?: SortOrder
    createdAt?: SortOrder
    updatedAt?: SortOrder
  }

  export type VerificationMinOrderByAggregateInput = {
    id?: SortOrder
    identifier?: SortOrder
    value?: SortOrder
    expiresAt?: SortOrder
    createdAt?: SortOrder
    updatedAt?: SortOrder
  }

  export type EnumCrisisTypeFilter<$PrismaModel = never> = {
    equals?: $Enums.CrisisType | EnumCrisisTypeFieldRefInput<$PrismaModel>
    in?: $Enums.CrisisType[] | ListEnumCrisisTypeFieldRefInput<$PrismaModel>
    notIn?: $Enums.CrisisType[] | ListEnumCrisisTypeFieldRefInput<$PrismaModel>
    not?: NestedEnumCrisisTypeFilter<$PrismaModel> | $Enums.CrisisType
  }

  export type EnumCrisisSeverityFilter<$PrismaModel = never> = {
    equals?: $Enums.CrisisSeverity | EnumCrisisSeverityFieldRefInput<$PrismaModel>
    in?: $Enums.CrisisSeverity[] | ListEnumCrisisSeverityFieldRefInput<$PrismaModel>
    notIn?: $Enums.CrisisSeverity[] | ListEnumCrisisSeverityFieldRefInput<$PrismaModel>
    not?: NestedEnumCrisisSeverityFilter<$PrismaModel> | $Enums.CrisisSeverity
  }

  export type FloatNullableFilter<$PrismaModel = never> = {
    equals?: number | FloatFieldRefInput<$PrismaModel> | null
    in?: number[] | ListFloatFieldRefInput<$PrismaModel> | null
    notIn?: number[] | ListFloatFieldRefInput<$PrismaModel> | null
    lt?: number | FloatFieldRefInput<$PrismaModel>
    lte?: number | FloatFieldRefInput<$PrismaModel>
    gt?: number | FloatFieldRefInput<$PrismaModel>
    gte?: number | FloatFieldRefInput<$PrismaModel>
    not?: NestedFloatNullableFilter<$PrismaModel> | number | null
  }

  export type IntFilter<$PrismaModel = never> = {
    equals?: number | IntFieldRefInput<$PrismaModel>
    in?: number[] | ListIntFieldRefInput<$PrismaModel>
    notIn?: number[] | ListIntFieldRefInput<$PrismaModel>
    lt?: number | IntFieldRefInput<$PrismaModel>
    lte?: number | IntFieldRefInput<$PrismaModel>
    gt?: number | IntFieldRefInput<$PrismaModel>
    gte?: number | IntFieldRefInput<$PrismaModel>
    not?: NestedIntFilter<$PrismaModel> | number
  }

  export type EnumCrisisStatusFilter<$PrismaModel = never> = {
    equals?: $Enums.CrisisStatus | EnumCrisisStatusFieldRefInput<$PrismaModel>
    in?: $Enums.CrisisStatus[] | ListEnumCrisisStatusFieldRefInput<$PrismaModel>
    notIn?: $Enums.CrisisStatus[] | ListEnumCrisisStatusFieldRefInput<$PrismaModel>
    not?: NestedEnumCrisisStatusFilter<$PrismaModel> | $Enums.CrisisStatus
  }

  export type AlertListRelationFilter = {
    every?: AlertWhereInput
    some?: AlertWhereInput
    none?: AlertWhereInput
  }

  export type AlertOrderByRelationAggregateInput = {
    _count?: SortOrder
  }

  export type CrisisCountOrderByAggregateInput = {
    id?: SortOrder
    title?: SortOrder
    type?: SortOrder
    severity?: SortOrder
    location?: SortOrder
    latitude?: SortOrder
    longitude?: SortOrder
    description?: SortOrder
    affectedPopulation?: SortOrder
    status?: SortOrder
    createdById?: SortOrder
    createdAt?: SortOrder
    updatedAt?: SortOrder
  }

  export type CrisisAvgOrderByAggregateInput = {
    latitude?: SortOrder
    longitude?: SortOrder
    affectedPopulation?: SortOrder
  }

  export type CrisisMaxOrderByAggregateInput = {
    id?: SortOrder
    title?: SortOrder
    type?: SortOrder
    severity?: SortOrder
    location?: SortOrder
    latitude?: SortOrder
    longitude?: SortOrder
    description?: SortOrder
    affectedPopulation?: SortOrder
    status?: SortOrder
    createdById?: SortOrder
    createdAt?: SortOrder
    updatedAt?: SortOrder
  }

  export type CrisisMinOrderByAggregateInput = {
    id?: SortOrder
    title?: SortOrder
    type?: SortOrder
    severity?: SortOrder
    location?: SortOrder
    latitude?: SortOrder
    longitude?: SortOrder
    description?: SortOrder
    affectedPopulation?: SortOrder
    status?: SortOrder
    createdById?: SortOrder
    createdAt?: SortOrder
    updatedAt?: SortOrder
  }

  export type CrisisSumOrderByAggregateInput = {
    latitude?: SortOrder
    longitude?: SortOrder
    affectedPopulation?: SortOrder
  }

  export type EnumCrisisTypeWithAggregatesFilter<$PrismaModel = never> = {
    equals?: $Enums.CrisisType | EnumCrisisTypeFieldRefInput<$PrismaModel>
    in?: $Enums.CrisisType[] | ListEnumCrisisTypeFieldRefInput<$PrismaModel>
    notIn?: $Enums.CrisisType[] | ListEnumCrisisTypeFieldRefInput<$PrismaModel>
    not?: NestedEnumCrisisTypeWithAggregatesFilter<$PrismaModel> | $Enums.CrisisType
    _count?: NestedIntFilter<$PrismaModel>
    _min?: NestedEnumCrisisTypeFilter<$PrismaModel>
    _max?: NestedEnumCrisisTypeFilter<$PrismaModel>
  }

  export type EnumCrisisSeverityWithAggregatesFilter<$PrismaModel = never> = {
    equals?: $Enums.CrisisSeverity | EnumCrisisSeverityFieldRefInput<$PrismaModel>
    in?: $Enums.CrisisSeverity[] | ListEnumCrisisSeverityFieldRefInput<$PrismaModel>
    notIn?: $Enums.CrisisSeverity[] | ListEnumCrisisSeverityFieldRefInput<$PrismaModel>
    not?: NestedEnumCrisisSeverityWithAggregatesFilter<$PrismaModel> | $Enums.CrisisSeverity
    _count?: NestedIntFilter<$PrismaModel>
    _min?: NestedEnumCrisisSeverityFilter<$PrismaModel>
    _max?: NestedEnumCrisisSeverityFilter<$PrismaModel>
  }

  export type FloatNullableWithAggregatesFilter<$PrismaModel = never> = {
    equals?: number | FloatFieldRefInput<$PrismaModel> | null
    in?: number[] | ListFloatFieldRefInput<$PrismaModel> | null
    notIn?: number[] | ListFloatFieldRefInput<$PrismaModel> | null
    lt?: number | FloatFieldRefInput<$PrismaModel>
    lte?: number | FloatFieldRefInput<$PrismaModel>
    gt?: number | FloatFieldRefInput<$PrismaModel>
    gte?: number | FloatFieldRefInput<$PrismaModel>
    not?: NestedFloatNullableWithAggregatesFilter<$PrismaModel> | number | null
    _count?: NestedIntNullableFilter<$PrismaModel>
    _avg?: NestedFloatNullableFilter<$PrismaModel>
    _sum?: NestedFloatNullableFilter<$PrismaModel>
    _min?: NestedFloatNullableFilter<$PrismaModel>
    _max?: NestedFloatNullableFilter<$PrismaModel>
  }

  export type IntWithAggregatesFilter<$PrismaModel = never> = {
    equals?: number | IntFieldRefInput<$PrismaModel>
    in?: number[] | ListIntFieldRefInput<$PrismaModel>
    notIn?: number[] | ListIntFieldRefInput<$PrismaModel>
    lt?: number | IntFieldRefInput<$PrismaModel>
    lte?: number | IntFieldRefInput<$PrismaModel>
    gt?: number | IntFieldRefInput<$PrismaModel>
    gte?: number | IntFieldRefInput<$PrismaModel>
    not?: NestedIntWithAggregatesFilter<$PrismaModel> | number
    _count?: NestedIntFilter<$PrismaModel>
    _avg?: NestedFloatFilter<$PrismaModel>
    _sum?: NestedIntFilter<$PrismaModel>
    _min?: NestedIntFilter<$PrismaModel>
    _max?: NestedIntFilter<$PrismaModel>
  }

  export type EnumCrisisStatusWithAggregatesFilter<$PrismaModel = never> = {
    equals?: $Enums.CrisisStatus | EnumCrisisStatusFieldRefInput<$PrismaModel>
    in?: $Enums.CrisisStatus[] | ListEnumCrisisStatusFieldRefInput<$PrismaModel>
    notIn?: $Enums.CrisisStatus[] | ListEnumCrisisStatusFieldRefInput<$PrismaModel>
    not?: NestedEnumCrisisStatusWithAggregatesFilter<$PrismaModel> | $Enums.CrisisStatus
    _count?: NestedIntFilter<$PrismaModel>
    _min?: NestedEnumCrisisStatusFilter<$PrismaModel>
    _max?: NestedEnumCrisisStatusFilter<$PrismaModel>
  }

  export type EnumSelectedOptionFilter<$PrismaModel = never> = {
    equals?: $Enums.SelectedOption | EnumSelectedOptionFieldRefInput<$PrismaModel>
    in?: $Enums.SelectedOption[] | ListEnumSelectedOptionFieldRefInput<$PrismaModel>
    notIn?: $Enums.SelectedOption[] | ListEnumSelectedOptionFieldRefInput<$PrismaModel>
    not?: NestedEnumSelectedOptionFilter<$PrismaModel> | $Enums.SelectedOption
  }

  export type CrisisScalarRelationFilter = {
    is?: CrisisWhereInput
    isNot?: CrisisWhereInput
  }

  export type DecisionCountOrderByAggregateInput = {
    id?: SortOrder
    crisisId?: SortOrder
    title?: SortOrder
    decisionText?: SortOrder
    rationale?: SortOrder
    confidenceScore?: SortOrder
    optionA?: SortOrder
    optionB?: SortOrder
    optionC?: SortOrder
    selectedOption?: SortOrder
    outcome?: SortOrder
    madeById?: SortOrder
    createdAt?: SortOrder
    updatedAt?: SortOrder
  }

  export type DecisionAvgOrderByAggregateInput = {
    confidenceScore?: SortOrder
  }

  export type DecisionMaxOrderByAggregateInput = {
    id?: SortOrder
    crisisId?: SortOrder
    title?: SortOrder
    decisionText?: SortOrder
    rationale?: SortOrder
    confidenceScore?: SortOrder
    optionA?: SortOrder
    optionB?: SortOrder
    optionC?: SortOrder
    selectedOption?: SortOrder
    outcome?: SortOrder
    madeById?: SortOrder
    createdAt?: SortOrder
    updatedAt?: SortOrder
  }

  export type DecisionMinOrderByAggregateInput = {
    id?: SortOrder
    crisisId?: SortOrder
    title?: SortOrder
    decisionText?: SortOrder
    rationale?: SortOrder
    confidenceScore?: SortOrder
    optionA?: SortOrder
    optionB?: SortOrder
    optionC?: SortOrder
    selectedOption?: SortOrder
    outcome?: SortOrder
    madeById?: SortOrder
    createdAt?: SortOrder
    updatedAt?: SortOrder
  }

  export type DecisionSumOrderByAggregateInput = {
    confidenceScore?: SortOrder
  }

  export type EnumSelectedOptionWithAggregatesFilter<$PrismaModel = never> = {
    equals?: $Enums.SelectedOption | EnumSelectedOptionFieldRefInput<$PrismaModel>
    in?: $Enums.SelectedOption[] | ListEnumSelectedOptionFieldRefInput<$PrismaModel>
    notIn?: $Enums.SelectedOption[] | ListEnumSelectedOptionFieldRefInput<$PrismaModel>
    not?: NestedEnumSelectedOptionWithAggregatesFilter<$PrismaModel> | $Enums.SelectedOption
    _count?: NestedIntFilter<$PrismaModel>
    _min?: NestedEnumSelectedOptionFilter<$PrismaModel>
    _max?: NestedEnumSelectedOptionFilter<$PrismaModel>
  }

  export type EnumAlertTypeFilter<$PrismaModel = never> = {
    equals?: $Enums.AlertType | EnumAlertTypeFieldRefInput<$PrismaModel>
    in?: $Enums.AlertType[] | ListEnumAlertTypeFieldRefInput<$PrismaModel>
    notIn?: $Enums.AlertType[] | ListEnumAlertTypeFieldRefInput<$PrismaModel>
    not?: NestedEnumAlertTypeFilter<$PrismaModel> | $Enums.AlertType
  }

  export type EnumAlertSeverityFilter<$PrismaModel = never> = {
    equals?: $Enums.AlertSeverity | EnumAlertSeverityFieldRefInput<$PrismaModel>
    in?: $Enums.AlertSeverity[] | ListEnumAlertSeverityFieldRefInput<$PrismaModel>
    notIn?: $Enums.AlertSeverity[] | ListEnumAlertSeverityFieldRefInput<$PrismaModel>
    not?: NestedEnumAlertSeverityFilter<$PrismaModel> | $Enums.AlertSeverity
  }

  export type AlertCountOrderByAggregateInput = {
    id?: SortOrder
    crisisId?: SortOrder
    type?: SortOrder
    severity?: SortOrder
    message?: SortOrder
    isActive?: SortOrder
    triggeredAt?: SortOrder
    resolvedAt?: SortOrder
  }

  export type AlertMaxOrderByAggregateInput = {
    id?: SortOrder
    crisisId?: SortOrder
    type?: SortOrder
    severity?: SortOrder
    message?: SortOrder
    isActive?: SortOrder
    triggeredAt?: SortOrder
    resolvedAt?: SortOrder
  }

  export type AlertMinOrderByAggregateInput = {
    id?: SortOrder
    crisisId?: SortOrder
    type?: SortOrder
    severity?: SortOrder
    message?: SortOrder
    isActive?: SortOrder
    triggeredAt?: SortOrder
    resolvedAt?: SortOrder
  }

  export type EnumAlertTypeWithAggregatesFilter<$PrismaModel = never> = {
    equals?: $Enums.AlertType | EnumAlertTypeFieldRefInput<$PrismaModel>
    in?: $Enums.AlertType[] | ListEnumAlertTypeFieldRefInput<$PrismaModel>
    notIn?: $Enums.AlertType[] | ListEnumAlertTypeFieldRefInput<$PrismaModel>
    not?: NestedEnumAlertTypeWithAggregatesFilter<$PrismaModel> | $Enums.AlertType
    _count?: NestedIntFilter<$PrismaModel>
    _min?: NestedEnumAlertTypeFilter<$PrismaModel>
    _max?: NestedEnumAlertTypeFilter<$PrismaModel>
  }

  export type EnumAlertSeverityWithAggregatesFilter<$PrismaModel = never> = {
    equals?: $Enums.AlertSeverity | EnumAlertSeverityFieldRefInput<$PrismaModel>
    in?: $Enums.AlertSeverity[] | ListEnumAlertSeverityFieldRefInput<$PrismaModel>
    notIn?: $Enums.AlertSeverity[] | ListEnumAlertSeverityFieldRefInput<$PrismaModel>
    not?: NestedEnumAlertSeverityWithAggregatesFilter<$PrismaModel> | $Enums.AlertSeverity
    _count?: NestedIntFilter<$PrismaModel>
    _min?: NestedEnumAlertSeverityFilter<$PrismaModel>
    _max?: NestedEnumAlertSeverityFilter<$PrismaModel>
  }

  export type EnumAuditDecisionTypeFilter<$PrismaModel = never> = {
    equals?: $Enums.AuditDecisionType | EnumAuditDecisionTypeFieldRefInput<$PrismaModel>
    in?: $Enums.AuditDecisionType[] | ListEnumAuditDecisionTypeFieldRefInput<$PrismaModel>
    notIn?: $Enums.AuditDecisionType[] | ListEnumAuditDecisionTypeFieldRefInput<$PrismaModel>
    not?: NestedEnumAuditDecisionTypeFilter<$PrismaModel> | $Enums.AuditDecisionType
  }

  export type EnumRiskLevelFilter<$PrismaModel = never> = {
    equals?: $Enums.RiskLevel | EnumRiskLevelFieldRefInput<$PrismaModel>
    in?: $Enums.RiskLevel[] | ListEnumRiskLevelFieldRefInput<$PrismaModel>
    notIn?: $Enums.RiskLevel[] | ListEnumRiskLevelFieldRefInput<$PrismaModel>
    not?: NestedEnumRiskLevelFilter<$PrismaModel> | $Enums.RiskLevel
  }
  export type JsonFilter<$PrismaModel = never> =
    | PatchUndefined<
        Either<Required<JsonFilterBase<$PrismaModel>>, Exclude<keyof Required<JsonFilterBase<$PrismaModel>>, 'path'>>,
        Required<JsonFilterBase<$PrismaModel>>
      >
    | OptionalFlat<Omit<Required<JsonFilterBase<$PrismaModel>>, 'path'>>

  export type JsonFilterBase<$PrismaModel = never> = {
    equals?: InputJsonValue | JsonFieldRefInput<$PrismaModel> | JsonNullValueFilter
    path?: string[]
    mode?: QueryMode | EnumQueryModeFieldRefInput<$PrismaModel>
    string_contains?: string | StringFieldRefInput<$PrismaModel>
    string_starts_with?: string | StringFieldRefInput<$PrismaModel>
    string_ends_with?: string | StringFieldRefInput<$PrismaModel>
    array_starts_with?: InputJsonValue | JsonFieldRefInput<$PrismaModel> | null
    array_ends_with?: InputJsonValue | JsonFieldRefInput<$PrismaModel> | null
    array_contains?: InputJsonValue | JsonFieldRefInput<$PrismaModel> | null
    lt?: InputJsonValue | JsonFieldRefInput<$PrismaModel>
    lte?: InputJsonValue | JsonFieldRefInput<$PrismaModel>
    gt?: InputJsonValue | JsonFieldRefInput<$PrismaModel>
    gte?: InputJsonValue | JsonFieldRefInput<$PrismaModel>
    not?: InputJsonValue | JsonFieldRefInput<$PrismaModel> | JsonNullValueFilter
  }

  export type EnumAuditStatusFilter<$PrismaModel = never> = {
    equals?: $Enums.AuditStatus | EnumAuditStatusFieldRefInput<$PrismaModel>
    in?: $Enums.AuditStatus[] | ListEnumAuditStatusFieldRefInput<$PrismaModel>
    notIn?: $Enums.AuditStatus[] | ListEnumAuditStatusFieldRefInput<$PrismaModel>
    not?: NestedEnumAuditStatusFilter<$PrismaModel> | $Enums.AuditStatus
  }

  export type EnumSyncStatusFilter<$PrismaModel = never> = {
    equals?: $Enums.SyncStatus | EnumSyncStatusFieldRefInput<$PrismaModel>
    in?: $Enums.SyncStatus[] | ListEnumSyncStatusFieldRefInput<$PrismaModel>
    notIn?: $Enums.SyncStatus[] | ListEnumSyncStatusFieldRefInput<$PrismaModel>
    not?: NestedEnumSyncStatusFilter<$PrismaModel> | $Enums.SyncStatus
  }

  export type EnumPriorityFilter<$PrismaModel = never> = {
    equals?: $Enums.Priority | EnumPriorityFieldRefInput<$PrismaModel>
    in?: $Enums.Priority[] | ListEnumPriorityFieldRefInput<$PrismaModel>
    notIn?: $Enums.Priority[] | ListEnumPriorityFieldRefInput<$PrismaModel>
    not?: NestedEnumPriorityFilter<$PrismaModel> | $Enums.Priority
  }

  export type EvidenceListRelationFilter = {
    every?: EvidenceWhereInput
    some?: EvidenceWhereInput
    none?: EvidenceWhereInput
  }

  export type EvidenceOrderByRelationAggregateInput = {
    _count?: SortOrder
  }

  export type AuditDecisionCountOrderByAggregateInput = {
    id?: SortOrder
    title?: SortOrder
    type?: SortOrder
    decisionMade?: SortOrder
    rationale?: SortOrder
    riskLevel?: SortOrder
    informationSources?: SortOrder
    stakeholders?: SortOrder
    alternatives?: SortOrder
    locationLat?: SortOrder
    locationLng?: SortOrder
    locationAddress?: SortOrder
    deviceId?: SortOrder
    status?: SortOrder
    syncStatus?: SortOrder
    tags?: SortOrder
    priority?: SortOrder
    cryptoHash?: SortOrder
    createdById?: SortOrder
    createdAt?: SortOrder
    updatedAt?: SortOrder
  }

  export type AuditDecisionAvgOrderByAggregateInput = {
    locationLat?: SortOrder
    locationLng?: SortOrder
  }

  export type AuditDecisionMaxOrderByAggregateInput = {
    id?: SortOrder
    title?: SortOrder
    type?: SortOrder
    decisionMade?: SortOrder
    rationale?: SortOrder
    riskLevel?: SortOrder
    alternatives?: SortOrder
    locationLat?: SortOrder
    locationLng?: SortOrder
    locationAddress?: SortOrder
    deviceId?: SortOrder
    status?: SortOrder
    syncStatus?: SortOrder
    priority?: SortOrder
    cryptoHash?: SortOrder
    createdById?: SortOrder
    createdAt?: SortOrder
    updatedAt?: SortOrder
  }

  export type AuditDecisionMinOrderByAggregateInput = {
    id?: SortOrder
    title?: SortOrder
    type?: SortOrder
    decisionMade?: SortOrder
    rationale?: SortOrder
    riskLevel?: SortOrder
    alternatives?: SortOrder
    locationLat?: SortOrder
    locationLng?: SortOrder
    locationAddress?: SortOrder
    deviceId?: SortOrder
    status?: SortOrder
    syncStatus?: SortOrder
    priority?: SortOrder
    cryptoHash?: SortOrder
    createdById?: SortOrder
    createdAt?: SortOrder
    updatedAt?: SortOrder
  }

  export type AuditDecisionSumOrderByAggregateInput = {
    locationLat?: SortOrder
    locationLng?: SortOrder
  }

  export type EnumAuditDecisionTypeWithAggregatesFilter<$PrismaModel = never> = {
    equals?: $Enums.AuditDecisionType | EnumAuditDecisionTypeFieldRefInput<$PrismaModel>
    in?: $Enums.AuditDecisionType[] | ListEnumAuditDecisionTypeFieldRefInput<$PrismaModel>
    notIn?: $Enums.AuditDecisionType[] | ListEnumAuditDecisionTypeFieldRefInput<$PrismaModel>
    not?: NestedEnumAuditDecisionTypeWithAggregatesFilter<$PrismaModel> | $Enums.AuditDecisionType
    _count?: NestedIntFilter<$PrismaModel>
    _min?: NestedEnumAuditDecisionTypeFilter<$PrismaModel>
    _max?: NestedEnumAuditDecisionTypeFilter<$PrismaModel>
  }

  export type EnumRiskLevelWithAggregatesFilter<$PrismaModel = never> = {
    equals?: $Enums.RiskLevel | EnumRiskLevelFieldRefInput<$PrismaModel>
    in?: $Enums.RiskLevel[] | ListEnumRiskLevelFieldRefInput<$PrismaModel>
    notIn?: $Enums.RiskLevel[] | ListEnumRiskLevelFieldRefInput<$PrismaModel>
    not?: NestedEnumRiskLevelWithAggregatesFilter<$PrismaModel> | $Enums.RiskLevel
    _count?: NestedIntFilter<$PrismaModel>
    _min?: NestedEnumRiskLevelFilter<$PrismaModel>
    _max?: NestedEnumRiskLevelFilter<$PrismaModel>
  }
  export type JsonWithAggregatesFilter<$PrismaModel = never> =
    | PatchUndefined<
        Either<Required<JsonWithAggregatesFilterBase<$PrismaModel>>, Exclude<keyof Required<JsonWithAggregatesFilterBase<$PrismaModel>>, 'path'>>,
        Required<JsonWithAggregatesFilterBase<$PrismaModel>>
      >
    | OptionalFlat<Omit<Required<JsonWithAggregatesFilterBase<$PrismaModel>>, 'path'>>

  export type JsonWithAggregatesFilterBase<$PrismaModel = never> = {
    equals?: InputJsonValue | JsonFieldRefInput<$PrismaModel> | JsonNullValueFilter
    path?: string[]
    mode?: QueryMode | EnumQueryModeFieldRefInput<$PrismaModel>
    string_contains?: string | StringFieldRefInput<$PrismaModel>
    string_starts_with?: string | StringFieldRefInput<$PrismaModel>
    string_ends_with?: string | StringFieldRefInput<$PrismaModel>
    array_starts_with?: InputJsonValue | JsonFieldRefInput<$PrismaModel> | null
    array_ends_with?: InputJsonValue | JsonFieldRefInput<$PrismaModel> | null
    array_contains?: InputJsonValue | JsonFieldRefInput<$PrismaModel> | null
    lt?: InputJsonValue | JsonFieldRefInput<$PrismaModel>
    lte?: InputJsonValue | JsonFieldRefInput<$PrismaModel>
    gt?: InputJsonValue | JsonFieldRefInput<$PrismaModel>
    gte?: InputJsonValue | JsonFieldRefInput<$PrismaModel>
    not?: InputJsonValue | JsonFieldRefInput<$PrismaModel> | JsonNullValueFilter
    _count?: NestedIntFilter<$PrismaModel>
    _min?: NestedJsonFilter<$PrismaModel>
    _max?: NestedJsonFilter<$PrismaModel>
  }

  export type EnumAuditStatusWithAggregatesFilter<$PrismaModel = never> = {
    equals?: $Enums.AuditStatus | EnumAuditStatusFieldRefInput<$PrismaModel>
    in?: $Enums.AuditStatus[] | ListEnumAuditStatusFieldRefInput<$PrismaModel>
    notIn?: $Enums.AuditStatus[] | ListEnumAuditStatusFieldRefInput<$PrismaModel>
    not?: NestedEnumAuditStatusWithAggregatesFilter<$PrismaModel> | $Enums.AuditStatus
    _count?: NestedIntFilter<$PrismaModel>
    _min?: NestedEnumAuditStatusFilter<$PrismaModel>
    _max?: NestedEnumAuditStatusFilter<$PrismaModel>
  }

  export type EnumSyncStatusWithAggregatesFilter<$PrismaModel = never> = {
    equals?: $Enums.SyncStatus | EnumSyncStatusFieldRefInput<$PrismaModel>
    in?: $Enums.SyncStatus[] | ListEnumSyncStatusFieldRefInput<$PrismaModel>
    notIn?: $Enums.SyncStatus[] | ListEnumSyncStatusFieldRefInput<$PrismaModel>
    not?: NestedEnumSyncStatusWithAggregatesFilter<$PrismaModel> | $Enums.SyncStatus
    _count?: NestedIntFilter<$PrismaModel>
    _min?: NestedEnumSyncStatusFilter<$PrismaModel>
    _max?: NestedEnumSyncStatusFilter<$PrismaModel>
  }

  export type EnumPriorityWithAggregatesFilter<$PrismaModel = never> = {
    equals?: $Enums.Priority | EnumPriorityFieldRefInput<$PrismaModel>
    in?: $Enums.Priority[] | ListEnumPriorityFieldRefInput<$PrismaModel>
    notIn?: $Enums.Priority[] | ListEnumPriorityFieldRefInput<$PrismaModel>
    not?: NestedEnumPriorityWithAggregatesFilter<$PrismaModel> | $Enums.Priority
    _count?: NestedIntFilter<$PrismaModel>
    _min?: NestedEnumPriorityFilter<$PrismaModel>
    _max?: NestedEnumPriorityFilter<$PrismaModel>
  }

  export type EnumEvidenceTypeFilter<$PrismaModel = never> = {
    equals?: $Enums.EvidenceType | EnumEvidenceTypeFieldRefInput<$PrismaModel>
    in?: $Enums.EvidenceType[] | ListEnumEvidenceTypeFieldRefInput<$PrismaModel>
    notIn?: $Enums.EvidenceType[] | ListEnumEvidenceTypeFieldRefInput<$PrismaModel>
    not?: NestedEnumEvidenceTypeFilter<$PrismaModel> | $Enums.EvidenceType
  }
  export type JsonNullableFilter<$PrismaModel = never> =
    | PatchUndefined<
        Either<Required<JsonNullableFilterBase<$PrismaModel>>, Exclude<keyof Required<JsonNullableFilterBase<$PrismaModel>>, 'path'>>,
        Required<JsonNullableFilterBase<$PrismaModel>>
      >
    | OptionalFlat<Omit<Required<JsonNullableFilterBase<$PrismaModel>>, 'path'>>

  export type JsonNullableFilterBase<$PrismaModel = never> = {
    equals?: InputJsonValue | JsonFieldRefInput<$PrismaModel> | JsonNullValueFilter
    path?: string[]
    mode?: QueryMode | EnumQueryModeFieldRefInput<$PrismaModel>
    string_contains?: string | StringFieldRefInput<$PrismaModel>
    string_starts_with?: string | StringFieldRefInput<$PrismaModel>
    string_ends_with?: string | StringFieldRefInput<$PrismaModel>
    array_starts_with?: InputJsonValue | JsonFieldRefInput<$PrismaModel> | null
    array_ends_with?: InputJsonValue | JsonFieldRefInput<$PrismaModel> | null
    array_contains?: InputJsonValue | JsonFieldRefInput<$PrismaModel> | null
    lt?: InputJsonValue | JsonFieldRefInput<$PrismaModel>
    lte?: InputJsonValue | JsonFieldRefInput<$PrismaModel>
    gt?: InputJsonValue | JsonFieldRefInput<$PrismaModel>
    gte?: InputJsonValue | JsonFieldRefInput<$PrismaModel>
    not?: InputJsonValue | JsonFieldRefInput<$PrismaModel> | JsonNullValueFilter
  }

  export type AuditDecisionScalarRelationFilter = {
    is?: AuditDecisionWhereInput
    isNot?: AuditDecisionWhereInput
  }

  export type EvidenceCountOrderByAggregateInput = {
    id?: SortOrder
    auditDecisionId?: SortOrder
    type?: SortOrder
    filename?: SortOrder
    size?: SortOrder
    hash?: SortOrder
    metadata?: SortOrder
    createdAt?: SortOrder
  }

  export type EvidenceAvgOrderByAggregateInput = {
    size?: SortOrder
  }

  export type EvidenceMaxOrderByAggregateInput = {
    id?: SortOrder
    auditDecisionId?: SortOrder
    type?: SortOrder
    filename?: SortOrder
    size?: SortOrder
    hash?: SortOrder
    createdAt?: SortOrder
  }

  export type EvidenceMinOrderByAggregateInput = {
    id?: SortOrder
    auditDecisionId?: SortOrder
    type?: SortOrder
    filename?: SortOrder
    size?: SortOrder
    hash?: SortOrder
    createdAt?: SortOrder
  }

  export type EvidenceSumOrderByAggregateInput = {
    size?: SortOrder
  }

  export type EnumEvidenceTypeWithAggregatesFilter<$PrismaModel = never> = {
    equals?: $Enums.EvidenceType | EnumEvidenceTypeFieldRefInput<$PrismaModel>
    in?: $Enums.EvidenceType[] | ListEnumEvidenceTypeFieldRefInput<$PrismaModel>
    notIn?: $Enums.EvidenceType[] | ListEnumEvidenceTypeFieldRefInput<$PrismaModel>
    not?: NestedEnumEvidenceTypeWithAggregatesFilter<$PrismaModel> | $Enums.EvidenceType
    _count?: NestedIntFilter<$PrismaModel>
    _min?: NestedEnumEvidenceTypeFilter<$PrismaModel>
    _max?: NestedEnumEvidenceTypeFilter<$PrismaModel>
  }
  export type JsonNullableWithAggregatesFilter<$PrismaModel = never> =
    | PatchUndefined<
        Either<Required<JsonNullableWithAggregatesFilterBase<$PrismaModel>>, Exclude<keyof Required<JsonNullableWithAggregatesFilterBase<$PrismaModel>>, 'path'>>,
        Required<JsonNullableWithAggregatesFilterBase<$PrismaModel>>
      >
    | OptionalFlat<Omit<Required<JsonNullableWithAggregatesFilterBase<$PrismaModel>>, 'path'>>

  export type JsonNullableWithAggregatesFilterBase<$PrismaModel = never> = {
    equals?: InputJsonValue | JsonFieldRefInput<$PrismaModel> | JsonNullValueFilter
    path?: string[]
    mode?: QueryMode | EnumQueryModeFieldRefInput<$PrismaModel>
    string_contains?: string | StringFieldRefInput<$PrismaModel>
    string_starts_with?: string | StringFieldRefInput<$PrismaModel>
    string_ends_with?: string | StringFieldRefInput<$PrismaModel>
    array_starts_with?: InputJsonValue | JsonFieldRefInput<$PrismaModel> | null
    array_ends_with?: InputJsonValue | JsonFieldRefInput<$PrismaModel> | null
    array_contains?: InputJsonValue | JsonFieldRefInput<$PrismaModel> | null
    lt?: InputJsonValue | JsonFieldRefInput<$PrismaModel>
    lte?: InputJsonValue | JsonFieldRefInput<$PrismaModel>
    gt?: InputJsonValue | JsonFieldRefInput<$PrismaModel>
    gte?: InputJsonValue | JsonFieldRefInput<$PrismaModel>
    not?: InputJsonValue | JsonFieldRefInput<$PrismaModel> | JsonNullValueFilter
    _count?: NestedIntNullableFilter<$PrismaModel>
    _min?: NestedJsonNullableFilter<$PrismaModel>
    _max?: NestedJsonNullableFilter<$PrismaModel>
  }

  export type SessionCreateNestedManyWithoutUserInput = {
    create?: XOR<SessionCreateWithoutUserInput, SessionUncheckedCreateWithoutUserInput> | SessionCreateWithoutUserInput[] | SessionUncheckedCreateWithoutUserInput[]
    connectOrCreate?: SessionCreateOrConnectWithoutUserInput | SessionCreateOrConnectWithoutUserInput[]
    createMany?: SessionCreateManyUserInputEnvelope
    connect?: SessionWhereUniqueInput | SessionWhereUniqueInput[]
  }

  export type AccountCreateNestedManyWithoutUserInput = {
    create?: XOR<AccountCreateWithoutUserInput, AccountUncheckedCreateWithoutUserInput> | AccountCreateWithoutUserInput[] | AccountUncheckedCreateWithoutUserInput[]
    connectOrCreate?: AccountCreateOrConnectWithoutUserInput | AccountCreateOrConnectWithoutUserInput[]
    createMany?: AccountCreateManyUserInputEnvelope
    connect?: AccountWhereUniqueInput | AccountWhereUniqueInput[]
  }

  export type DecisionCreateNestedManyWithoutMadeByInput = {
    create?: XOR<DecisionCreateWithoutMadeByInput, DecisionUncheckedCreateWithoutMadeByInput> | DecisionCreateWithoutMadeByInput[] | DecisionUncheckedCreateWithoutMadeByInput[]
    connectOrCreate?: DecisionCreateOrConnectWithoutMadeByInput | DecisionCreateOrConnectWithoutMadeByInput[]
    createMany?: DecisionCreateManyMadeByInputEnvelope
    connect?: DecisionWhereUniqueInput | DecisionWhereUniqueInput[]
  }

  export type AuditDecisionCreateNestedManyWithoutCreatedByInput = {
    create?: XOR<AuditDecisionCreateWithoutCreatedByInput, AuditDecisionUncheckedCreateWithoutCreatedByInput> | AuditDecisionCreateWithoutCreatedByInput[] | AuditDecisionUncheckedCreateWithoutCreatedByInput[]
    connectOrCreate?: AuditDecisionCreateOrConnectWithoutCreatedByInput | AuditDecisionCreateOrConnectWithoutCreatedByInput[]
    createMany?: AuditDecisionCreateManyCreatedByInputEnvelope
    connect?: AuditDecisionWhereUniqueInput | AuditDecisionWhereUniqueInput[]
  }

  export type CrisisCreateNestedManyWithoutCreatedByInput = {
    create?: XOR<CrisisCreateWithoutCreatedByInput, CrisisUncheckedCreateWithoutCreatedByInput> | CrisisCreateWithoutCreatedByInput[] | CrisisUncheckedCreateWithoutCreatedByInput[]
    connectOrCreate?: CrisisCreateOrConnectWithoutCreatedByInput | CrisisCreateOrConnectWithoutCreatedByInput[]
    createMany?: CrisisCreateManyCreatedByInputEnvelope
    connect?: CrisisWhereUniqueInput | CrisisWhereUniqueInput[]
  }

  export type SessionUncheckedCreateNestedManyWithoutUserInput = {
    create?: XOR<SessionCreateWithoutUserInput, SessionUncheckedCreateWithoutUserInput> | SessionCreateWithoutUserInput[] | SessionUncheckedCreateWithoutUserInput[]
    connectOrCreate?: SessionCreateOrConnectWithoutUserInput | SessionCreateOrConnectWithoutUserInput[]
    createMany?: SessionCreateManyUserInputEnvelope
    connect?: SessionWhereUniqueInput | SessionWhereUniqueInput[]
  }

  export type AccountUncheckedCreateNestedManyWithoutUserInput = {
    create?: XOR<AccountCreateWithoutUserInput, AccountUncheckedCreateWithoutUserInput> | AccountCreateWithoutUserInput[] | AccountUncheckedCreateWithoutUserInput[]
    connectOrCreate?: AccountCreateOrConnectWithoutUserInput | AccountCreateOrConnectWithoutUserInput[]
    createMany?: AccountCreateManyUserInputEnvelope
    connect?: AccountWhereUniqueInput | AccountWhereUniqueInput[]
  }

  export type DecisionUncheckedCreateNestedManyWithoutMadeByInput = {
    create?: XOR<DecisionCreateWithoutMadeByInput, DecisionUncheckedCreateWithoutMadeByInput> | DecisionCreateWithoutMadeByInput[] | DecisionUncheckedCreateWithoutMadeByInput[]
    connectOrCreate?: DecisionCreateOrConnectWithoutMadeByInput | DecisionCreateOrConnectWithoutMadeByInput[]
    createMany?: DecisionCreateManyMadeByInputEnvelope
    connect?: DecisionWhereUniqueInput | DecisionWhereUniqueInput[]
  }

  export type AuditDecisionUncheckedCreateNestedManyWithoutCreatedByInput = {
    create?: XOR<AuditDecisionCreateWithoutCreatedByInput, AuditDecisionUncheckedCreateWithoutCreatedByInput> | AuditDecisionCreateWithoutCreatedByInput[] | AuditDecisionUncheckedCreateWithoutCreatedByInput[]
    connectOrCreate?: AuditDecisionCreateOrConnectWithoutCreatedByInput | AuditDecisionCreateOrConnectWithoutCreatedByInput[]
    createMany?: AuditDecisionCreateManyCreatedByInputEnvelope
    connect?: AuditDecisionWhereUniqueInput | AuditDecisionWhereUniqueInput[]
  }

  export type CrisisUncheckedCreateNestedManyWithoutCreatedByInput = {
    create?: XOR<CrisisCreateWithoutCreatedByInput, CrisisUncheckedCreateWithoutCreatedByInput> | CrisisCreateWithoutCreatedByInput[] | CrisisUncheckedCreateWithoutCreatedByInput[]
    connectOrCreate?: CrisisCreateOrConnectWithoutCreatedByInput | CrisisCreateOrConnectWithoutCreatedByInput[]
    createMany?: CrisisCreateManyCreatedByInputEnvelope
    connect?: CrisisWhereUniqueInput | CrisisWhereUniqueInput[]
  }

  export type StringFieldUpdateOperationsInput = {
    set?: string
  }

  export type BoolFieldUpdateOperationsInput = {
    set?: boolean
  }

  export type NullableStringFieldUpdateOperationsInput = {
    set?: string | null
  }

  export type DateTimeFieldUpdateOperationsInput = {
    set?: Date | string
  }

  export type EnumUserRoleFieldUpdateOperationsInput = {
    set?: $Enums.UserRole
  }

  export type SessionUpdateManyWithoutUserNestedInput = {
    create?: XOR<SessionCreateWithoutUserInput, SessionUncheckedCreateWithoutUserInput> | SessionCreateWithoutUserInput[] | SessionUncheckedCreateWithoutUserInput[]
    connectOrCreate?: SessionCreateOrConnectWithoutUserInput | SessionCreateOrConnectWithoutUserInput[]
    upsert?: SessionUpsertWithWhereUniqueWithoutUserInput | SessionUpsertWithWhereUniqueWithoutUserInput[]
    createMany?: SessionCreateManyUserInputEnvelope
    set?: SessionWhereUniqueInput | SessionWhereUniqueInput[]
    disconnect?: SessionWhereUniqueInput | SessionWhereUniqueInput[]
    delete?: SessionWhereUniqueInput | SessionWhereUniqueInput[]
    connect?: SessionWhereUniqueInput | SessionWhereUniqueInput[]
    update?: SessionUpdateWithWhereUniqueWithoutUserInput | SessionUpdateWithWhereUniqueWithoutUserInput[]
    updateMany?: SessionUpdateManyWithWhereWithoutUserInput | SessionUpdateManyWithWhereWithoutUserInput[]
    deleteMany?: SessionScalarWhereInput | SessionScalarWhereInput[]
  }

  export type AccountUpdateManyWithoutUserNestedInput = {
    create?: XOR<AccountCreateWithoutUserInput, AccountUncheckedCreateWithoutUserInput> | AccountCreateWithoutUserInput[] | AccountUncheckedCreateWithoutUserInput[]
    connectOrCreate?: AccountCreateOrConnectWithoutUserInput | AccountCreateOrConnectWithoutUserInput[]
    upsert?: AccountUpsertWithWhereUniqueWithoutUserInput | AccountUpsertWithWhereUniqueWithoutUserInput[]
    createMany?: AccountCreateManyUserInputEnvelope
    set?: AccountWhereUniqueInput | AccountWhereUniqueInput[]
    disconnect?: AccountWhereUniqueInput | AccountWhereUniqueInput[]
    delete?: AccountWhereUniqueInput | AccountWhereUniqueInput[]
    connect?: AccountWhereUniqueInput | AccountWhereUniqueInput[]
    update?: AccountUpdateWithWhereUniqueWithoutUserInput | AccountUpdateWithWhereUniqueWithoutUserInput[]
    updateMany?: AccountUpdateManyWithWhereWithoutUserInput | AccountUpdateManyWithWhereWithoutUserInput[]
    deleteMany?: AccountScalarWhereInput | AccountScalarWhereInput[]
  }

  export type DecisionUpdateManyWithoutMadeByNestedInput = {
    create?: XOR<DecisionCreateWithoutMadeByInput, DecisionUncheckedCreateWithoutMadeByInput> | DecisionCreateWithoutMadeByInput[] | DecisionUncheckedCreateWithoutMadeByInput[]
    connectOrCreate?: DecisionCreateOrConnectWithoutMadeByInput | DecisionCreateOrConnectWithoutMadeByInput[]
    upsert?: DecisionUpsertWithWhereUniqueWithoutMadeByInput | DecisionUpsertWithWhereUniqueWithoutMadeByInput[]
    createMany?: DecisionCreateManyMadeByInputEnvelope
    set?: DecisionWhereUniqueInput | DecisionWhereUniqueInput[]
    disconnect?: DecisionWhereUniqueInput | DecisionWhereUniqueInput[]
    delete?: DecisionWhereUniqueInput | DecisionWhereUniqueInput[]
    connect?: DecisionWhereUniqueInput | DecisionWhereUniqueInput[]
    update?: DecisionUpdateWithWhereUniqueWithoutMadeByInput | DecisionUpdateWithWhereUniqueWithoutMadeByInput[]
    updateMany?: DecisionUpdateManyWithWhereWithoutMadeByInput | DecisionUpdateManyWithWhereWithoutMadeByInput[]
    deleteMany?: DecisionScalarWhereInput | DecisionScalarWhereInput[]
  }

  export type AuditDecisionUpdateManyWithoutCreatedByNestedInput = {
    create?: XOR<AuditDecisionCreateWithoutCreatedByInput, AuditDecisionUncheckedCreateWithoutCreatedByInput> | AuditDecisionCreateWithoutCreatedByInput[] | AuditDecisionUncheckedCreateWithoutCreatedByInput[]
    connectOrCreate?: AuditDecisionCreateOrConnectWithoutCreatedByInput | AuditDecisionCreateOrConnectWithoutCreatedByInput[]
    upsert?: AuditDecisionUpsertWithWhereUniqueWithoutCreatedByInput | AuditDecisionUpsertWithWhereUniqueWithoutCreatedByInput[]
    createMany?: AuditDecisionCreateManyCreatedByInputEnvelope
    set?: AuditDecisionWhereUniqueInput | AuditDecisionWhereUniqueInput[]
    disconnect?: AuditDecisionWhereUniqueInput | AuditDecisionWhereUniqueInput[]
    delete?: AuditDecisionWhereUniqueInput | AuditDecisionWhereUniqueInput[]
    connect?: AuditDecisionWhereUniqueInput | AuditDecisionWhereUniqueInput[]
    update?: AuditDecisionUpdateWithWhereUniqueWithoutCreatedByInput | AuditDecisionUpdateWithWhereUniqueWithoutCreatedByInput[]
    updateMany?: AuditDecisionUpdateManyWithWhereWithoutCreatedByInput | AuditDecisionUpdateManyWithWhereWithoutCreatedByInput[]
    deleteMany?: AuditDecisionScalarWhereInput | AuditDecisionScalarWhereInput[]
  }

  export type CrisisUpdateManyWithoutCreatedByNestedInput = {
    create?: XOR<CrisisCreateWithoutCreatedByInput, CrisisUncheckedCreateWithoutCreatedByInput> | CrisisCreateWithoutCreatedByInput[] | CrisisUncheckedCreateWithoutCreatedByInput[]
    connectOrCreate?: CrisisCreateOrConnectWithoutCreatedByInput | CrisisCreateOrConnectWithoutCreatedByInput[]
    upsert?: CrisisUpsertWithWhereUniqueWithoutCreatedByInput | CrisisUpsertWithWhereUniqueWithoutCreatedByInput[]
    createMany?: CrisisCreateManyCreatedByInputEnvelope
    set?: CrisisWhereUniqueInput | CrisisWhereUniqueInput[]
    disconnect?: CrisisWhereUniqueInput | CrisisWhereUniqueInput[]
    delete?: CrisisWhereUniqueInput | CrisisWhereUniqueInput[]
    connect?: CrisisWhereUniqueInput | CrisisWhereUniqueInput[]
    update?: CrisisUpdateWithWhereUniqueWithoutCreatedByInput | CrisisUpdateWithWhereUniqueWithoutCreatedByInput[]
    updateMany?: CrisisUpdateManyWithWhereWithoutCreatedByInput | CrisisUpdateManyWithWhereWithoutCreatedByInput[]
    deleteMany?: CrisisScalarWhereInput | CrisisScalarWhereInput[]
  }

  export type SessionUncheckedUpdateManyWithoutUserNestedInput = {
    create?: XOR<SessionCreateWithoutUserInput, SessionUncheckedCreateWithoutUserInput> | SessionCreateWithoutUserInput[] | SessionUncheckedCreateWithoutUserInput[]
    connectOrCreate?: SessionCreateOrConnectWithoutUserInput | SessionCreateOrConnectWithoutUserInput[]
    upsert?: SessionUpsertWithWhereUniqueWithoutUserInput | SessionUpsertWithWhereUniqueWithoutUserInput[]
    createMany?: SessionCreateManyUserInputEnvelope
    set?: SessionWhereUniqueInput | SessionWhereUniqueInput[]
    disconnect?: SessionWhereUniqueInput | SessionWhereUniqueInput[]
    delete?: SessionWhereUniqueInput | SessionWhereUniqueInput[]
    connect?: SessionWhereUniqueInput | SessionWhereUniqueInput[]
    update?: SessionUpdateWithWhereUniqueWithoutUserInput | SessionUpdateWithWhereUniqueWithoutUserInput[]
    updateMany?: SessionUpdateManyWithWhereWithoutUserInput | SessionUpdateManyWithWhereWithoutUserInput[]
    deleteMany?: SessionScalarWhereInput | SessionScalarWhereInput[]
  }

  export type AccountUncheckedUpdateManyWithoutUserNestedInput = {
    create?: XOR<AccountCreateWithoutUserInput, AccountUncheckedCreateWithoutUserInput> | AccountCreateWithoutUserInput[] | AccountUncheckedCreateWithoutUserInput[]
    connectOrCreate?: AccountCreateOrConnectWithoutUserInput | AccountCreateOrConnectWithoutUserInput[]
    upsert?: AccountUpsertWithWhereUniqueWithoutUserInput | AccountUpsertWithWhereUniqueWithoutUserInput[]
    createMany?: AccountCreateManyUserInputEnvelope
    set?: AccountWhereUniqueInput | AccountWhereUniqueInput[]
    disconnect?: AccountWhereUniqueInput | AccountWhereUniqueInput[]
    delete?: AccountWhereUniqueInput | AccountWhereUniqueInput[]
    connect?: AccountWhereUniqueInput | AccountWhereUniqueInput[]
    update?: AccountUpdateWithWhereUniqueWithoutUserInput | AccountUpdateWithWhereUniqueWithoutUserInput[]
    updateMany?: AccountUpdateManyWithWhereWithoutUserInput | AccountUpdateManyWithWhereWithoutUserInput[]
    deleteMany?: AccountScalarWhereInput | AccountScalarWhereInput[]
  }

  export type DecisionUncheckedUpdateManyWithoutMadeByNestedInput = {
    create?: XOR<DecisionCreateWithoutMadeByInput, DecisionUncheckedCreateWithoutMadeByInput> | DecisionCreateWithoutMadeByInput[] | DecisionUncheckedCreateWithoutMadeByInput[]
    connectOrCreate?: DecisionCreateOrConnectWithoutMadeByInput | DecisionCreateOrConnectWithoutMadeByInput[]
    upsert?: DecisionUpsertWithWhereUniqueWithoutMadeByInput | DecisionUpsertWithWhereUniqueWithoutMadeByInput[]
    createMany?: DecisionCreateManyMadeByInputEnvelope
    set?: DecisionWhereUniqueInput | DecisionWhereUniqueInput[]
    disconnect?: DecisionWhereUniqueInput | DecisionWhereUniqueInput[]
    delete?: DecisionWhereUniqueInput | DecisionWhereUniqueInput[]
    connect?: DecisionWhereUniqueInput | DecisionWhereUniqueInput[]
    update?: DecisionUpdateWithWhereUniqueWithoutMadeByInput | DecisionUpdateWithWhereUniqueWithoutMadeByInput[]
    updateMany?: DecisionUpdateManyWithWhereWithoutMadeByInput | DecisionUpdateManyWithWhereWithoutMadeByInput[]
    deleteMany?: DecisionScalarWhereInput | DecisionScalarWhereInput[]
  }

  export type AuditDecisionUncheckedUpdateManyWithoutCreatedByNestedInput = {
    create?: XOR<AuditDecisionCreateWithoutCreatedByInput, AuditDecisionUncheckedCreateWithoutCreatedByInput> | AuditDecisionCreateWithoutCreatedByInput[] | AuditDecisionUncheckedCreateWithoutCreatedByInput[]
    connectOrCreate?: AuditDecisionCreateOrConnectWithoutCreatedByInput | AuditDecisionCreateOrConnectWithoutCreatedByInput[]
    upsert?: AuditDecisionUpsertWithWhereUniqueWithoutCreatedByInput | AuditDecisionUpsertWithWhereUniqueWithoutCreatedByInput[]
    createMany?: AuditDecisionCreateManyCreatedByInputEnvelope
    set?: AuditDecisionWhereUniqueInput | AuditDecisionWhereUniqueInput[]
    disconnect?: AuditDecisionWhereUniqueInput | AuditDecisionWhereUniqueInput[]
    delete?: AuditDecisionWhereUniqueInput | AuditDecisionWhereUniqueInput[]
    connect?: AuditDecisionWhereUniqueInput | AuditDecisionWhereUniqueInput[]
    update?: AuditDecisionUpdateWithWhereUniqueWithoutCreatedByInput | AuditDecisionUpdateWithWhereUniqueWithoutCreatedByInput[]
    updateMany?: AuditDecisionUpdateManyWithWhereWithoutCreatedByInput | AuditDecisionUpdateManyWithWhereWithoutCreatedByInput[]
    deleteMany?: AuditDecisionScalarWhereInput | AuditDecisionScalarWhereInput[]
  }

  export type CrisisUncheckedUpdateManyWithoutCreatedByNestedInput = {
    create?: XOR<CrisisCreateWithoutCreatedByInput, CrisisUncheckedCreateWithoutCreatedByInput> | CrisisCreateWithoutCreatedByInput[] | CrisisUncheckedCreateWithoutCreatedByInput[]
    connectOrCreate?: CrisisCreateOrConnectWithoutCreatedByInput | CrisisCreateOrConnectWithoutCreatedByInput[]
    upsert?: CrisisUpsertWithWhereUniqueWithoutCreatedByInput | CrisisUpsertWithWhereUniqueWithoutCreatedByInput[]
    createMany?: CrisisCreateManyCreatedByInputEnvelope
    set?: CrisisWhereUniqueInput | CrisisWhereUniqueInput[]
    disconnect?: CrisisWhereUniqueInput | CrisisWhereUniqueInput[]
    delete?: CrisisWhereUniqueInput | CrisisWhereUniqueInput[]
    connect?: CrisisWhereUniqueInput | CrisisWhereUniqueInput[]
    update?: CrisisUpdateWithWhereUniqueWithoutCreatedByInput | CrisisUpdateWithWhereUniqueWithoutCreatedByInput[]
    updateMany?: CrisisUpdateManyWithWhereWithoutCreatedByInput | CrisisUpdateManyWithWhereWithoutCreatedByInput[]
    deleteMany?: CrisisScalarWhereInput | CrisisScalarWhereInput[]
  }

  export type UserCreateNestedOneWithoutSessionsInput = {
    create?: XOR<UserCreateWithoutSessionsInput, UserUncheckedCreateWithoutSessionsInput>
    connectOrCreate?: UserCreateOrConnectWithoutSessionsInput
    connect?: UserWhereUniqueInput
  }

  export type UserUpdateOneRequiredWithoutSessionsNestedInput = {
    create?: XOR<UserCreateWithoutSessionsInput, UserUncheckedCreateWithoutSessionsInput>
    connectOrCreate?: UserCreateOrConnectWithoutSessionsInput
    upsert?: UserUpsertWithoutSessionsInput
    connect?: UserWhereUniqueInput
    update?: XOR<XOR<UserUpdateToOneWithWhereWithoutSessionsInput, UserUpdateWithoutSessionsInput>, UserUncheckedUpdateWithoutSessionsInput>
  }

  export type UserCreateNestedOneWithoutAccountsInput = {
    create?: XOR<UserCreateWithoutAccountsInput, UserUncheckedCreateWithoutAccountsInput>
    connectOrCreate?: UserCreateOrConnectWithoutAccountsInput
    connect?: UserWhereUniqueInput
  }

  export type NullableDateTimeFieldUpdateOperationsInput = {
    set?: Date | string | null
  }

  export type UserUpdateOneRequiredWithoutAccountsNestedInput = {
    create?: XOR<UserCreateWithoutAccountsInput, UserUncheckedCreateWithoutAccountsInput>
    connectOrCreate?: UserCreateOrConnectWithoutAccountsInput
    upsert?: UserUpsertWithoutAccountsInput
    connect?: UserWhereUniqueInput
    update?: XOR<XOR<UserUpdateToOneWithWhereWithoutAccountsInput, UserUpdateWithoutAccountsInput>, UserUncheckedUpdateWithoutAccountsInput>
  }

  export type UserCreateNestedOneWithoutCrisesInput = {
    create?: XOR<UserCreateWithoutCrisesInput, UserUncheckedCreateWithoutCrisesInput>
    connectOrCreate?: UserCreateOrConnectWithoutCrisesInput
    connect?: UserWhereUniqueInput
  }

  export type DecisionCreateNestedManyWithoutCrisisInput = {
    create?: XOR<DecisionCreateWithoutCrisisInput, DecisionUncheckedCreateWithoutCrisisInput> | DecisionCreateWithoutCrisisInput[] | DecisionUncheckedCreateWithoutCrisisInput[]
    connectOrCreate?: DecisionCreateOrConnectWithoutCrisisInput | DecisionCreateOrConnectWithoutCrisisInput[]
    createMany?: DecisionCreateManyCrisisInputEnvelope
    connect?: DecisionWhereUniqueInput | DecisionWhereUniqueInput[]
  }

  export type AlertCreateNestedManyWithoutCrisisInput = {
    create?: XOR<AlertCreateWithoutCrisisInput, AlertUncheckedCreateWithoutCrisisInput> | AlertCreateWithoutCrisisInput[] | AlertUncheckedCreateWithoutCrisisInput[]
    connectOrCreate?: AlertCreateOrConnectWithoutCrisisInput | AlertCreateOrConnectWithoutCrisisInput[]
    createMany?: AlertCreateManyCrisisInputEnvelope
    connect?: AlertWhereUniqueInput | AlertWhereUniqueInput[]
  }

  export type DecisionUncheckedCreateNestedManyWithoutCrisisInput = {
    create?: XOR<DecisionCreateWithoutCrisisInput, DecisionUncheckedCreateWithoutCrisisInput> | DecisionCreateWithoutCrisisInput[] | DecisionUncheckedCreateWithoutCrisisInput[]
    connectOrCreate?: DecisionCreateOrConnectWithoutCrisisInput | DecisionCreateOrConnectWithoutCrisisInput[]
    createMany?: DecisionCreateManyCrisisInputEnvelope
    connect?: DecisionWhereUniqueInput | DecisionWhereUniqueInput[]
  }

  export type AlertUncheckedCreateNestedManyWithoutCrisisInput = {
    create?: XOR<AlertCreateWithoutCrisisInput, AlertUncheckedCreateWithoutCrisisInput> | AlertCreateWithoutCrisisInput[] | AlertUncheckedCreateWithoutCrisisInput[]
    connectOrCreate?: AlertCreateOrConnectWithoutCrisisInput | AlertCreateOrConnectWithoutCrisisInput[]
    createMany?: AlertCreateManyCrisisInputEnvelope
    connect?: AlertWhereUniqueInput | AlertWhereUniqueInput[]
  }

  export type EnumCrisisTypeFieldUpdateOperationsInput = {
    set?: $Enums.CrisisType
  }

  export type EnumCrisisSeverityFieldUpdateOperationsInput = {
    set?: $Enums.CrisisSeverity
  }

  export type NullableFloatFieldUpdateOperationsInput = {
    set?: number | null
    increment?: number
    decrement?: number
    multiply?: number
    divide?: number
  }

  export type IntFieldUpdateOperationsInput = {
    set?: number
    increment?: number
    decrement?: number
    multiply?: number
    divide?: number
  }

  export type EnumCrisisStatusFieldUpdateOperationsInput = {
    set?: $Enums.CrisisStatus
  }

  export type UserUpdateOneRequiredWithoutCrisesNestedInput = {
    create?: XOR<UserCreateWithoutCrisesInput, UserUncheckedCreateWithoutCrisesInput>
    connectOrCreate?: UserCreateOrConnectWithoutCrisesInput
    upsert?: UserUpsertWithoutCrisesInput
    connect?: UserWhereUniqueInput
    update?: XOR<XOR<UserUpdateToOneWithWhereWithoutCrisesInput, UserUpdateWithoutCrisesInput>, UserUncheckedUpdateWithoutCrisesInput>
  }

  export type DecisionUpdateManyWithoutCrisisNestedInput = {
    create?: XOR<DecisionCreateWithoutCrisisInput, DecisionUncheckedCreateWithoutCrisisInput> | DecisionCreateWithoutCrisisInput[] | DecisionUncheckedCreateWithoutCrisisInput[]
    connectOrCreate?: DecisionCreateOrConnectWithoutCrisisInput | DecisionCreateOrConnectWithoutCrisisInput[]
    upsert?: DecisionUpsertWithWhereUniqueWithoutCrisisInput | DecisionUpsertWithWhereUniqueWithoutCrisisInput[]
    createMany?: DecisionCreateManyCrisisInputEnvelope
    set?: DecisionWhereUniqueInput | DecisionWhereUniqueInput[]
    disconnect?: DecisionWhereUniqueInput | DecisionWhereUniqueInput[]
    delete?: DecisionWhereUniqueInput | DecisionWhereUniqueInput[]
    connect?: DecisionWhereUniqueInput | DecisionWhereUniqueInput[]
    update?: DecisionUpdateWithWhereUniqueWithoutCrisisInput | DecisionUpdateWithWhereUniqueWithoutCrisisInput[]
    updateMany?: DecisionUpdateManyWithWhereWithoutCrisisInput | DecisionUpdateManyWithWhereWithoutCrisisInput[]
    deleteMany?: DecisionScalarWhereInput | DecisionScalarWhereInput[]
  }

  export type AlertUpdateManyWithoutCrisisNestedInput = {
    create?: XOR<AlertCreateWithoutCrisisInput, AlertUncheckedCreateWithoutCrisisInput> | AlertCreateWithoutCrisisInput[] | AlertUncheckedCreateWithoutCrisisInput[]
    connectOrCreate?: AlertCreateOrConnectWithoutCrisisInput | AlertCreateOrConnectWithoutCrisisInput[]
    upsert?: AlertUpsertWithWhereUniqueWithoutCrisisInput | AlertUpsertWithWhereUniqueWithoutCrisisInput[]
    createMany?: AlertCreateManyCrisisInputEnvelope
    set?: AlertWhereUniqueInput | AlertWhereUniqueInput[]
    disconnect?: AlertWhereUniqueInput | AlertWhereUniqueInput[]
    delete?: AlertWhereUniqueInput | AlertWhereUniqueInput[]
    connect?: AlertWhereUniqueInput | AlertWhereUniqueInput[]
    update?: AlertUpdateWithWhereUniqueWithoutCrisisInput | AlertUpdateWithWhereUniqueWithoutCrisisInput[]
    updateMany?: AlertUpdateManyWithWhereWithoutCrisisInput | AlertUpdateManyWithWhereWithoutCrisisInput[]
    deleteMany?: AlertScalarWhereInput | AlertScalarWhereInput[]
  }

  export type DecisionUncheckedUpdateManyWithoutCrisisNestedInput = {
    create?: XOR<DecisionCreateWithoutCrisisInput, DecisionUncheckedCreateWithoutCrisisInput> | DecisionCreateWithoutCrisisInput[] | DecisionUncheckedCreateWithoutCrisisInput[]
    connectOrCreate?: DecisionCreateOrConnectWithoutCrisisInput | DecisionCreateOrConnectWithoutCrisisInput[]
    upsert?: DecisionUpsertWithWhereUniqueWithoutCrisisInput | DecisionUpsertWithWhereUniqueWithoutCrisisInput[]
    createMany?: DecisionCreateManyCrisisInputEnvelope
    set?: DecisionWhereUniqueInput | DecisionWhereUniqueInput[]
    disconnect?: DecisionWhereUniqueInput | DecisionWhereUniqueInput[]
    delete?: DecisionWhereUniqueInput | DecisionWhereUniqueInput[]
    connect?: DecisionWhereUniqueInput | DecisionWhereUniqueInput[]
    update?: DecisionUpdateWithWhereUniqueWithoutCrisisInput | DecisionUpdateWithWhereUniqueWithoutCrisisInput[]
    updateMany?: DecisionUpdateManyWithWhereWithoutCrisisInput | DecisionUpdateManyWithWhereWithoutCrisisInput[]
    deleteMany?: DecisionScalarWhereInput | DecisionScalarWhereInput[]
  }

  export type AlertUncheckedUpdateManyWithoutCrisisNestedInput = {
    create?: XOR<AlertCreateWithoutCrisisInput, AlertUncheckedCreateWithoutCrisisInput> | AlertCreateWithoutCrisisInput[] | AlertUncheckedCreateWithoutCrisisInput[]
    connectOrCreate?: AlertCreateOrConnectWithoutCrisisInput | AlertCreateOrConnectWithoutCrisisInput[]
    upsert?: AlertUpsertWithWhereUniqueWithoutCrisisInput | AlertUpsertWithWhereUniqueWithoutCrisisInput[]
    createMany?: AlertCreateManyCrisisInputEnvelope
    set?: AlertWhereUniqueInput | AlertWhereUniqueInput[]
    disconnect?: AlertWhereUniqueInput | AlertWhereUniqueInput[]
    delete?: AlertWhereUniqueInput | AlertWhereUniqueInput[]
    connect?: AlertWhereUniqueInput | AlertWhereUniqueInput[]
    update?: AlertUpdateWithWhereUniqueWithoutCrisisInput | AlertUpdateWithWhereUniqueWithoutCrisisInput[]
    updateMany?: AlertUpdateManyWithWhereWithoutCrisisInput | AlertUpdateManyWithWhereWithoutCrisisInput[]
    deleteMany?: AlertScalarWhereInput | AlertScalarWhereInput[]
  }

  export type CrisisCreateNestedOneWithoutDecisionsInput = {
    create?: XOR<CrisisCreateWithoutDecisionsInput, CrisisUncheckedCreateWithoutDecisionsInput>
    connectOrCreate?: CrisisCreateOrConnectWithoutDecisionsInput
    connect?: CrisisWhereUniqueInput
  }

  export type UserCreateNestedOneWithoutDecisionsInput = {
    create?: XOR<UserCreateWithoutDecisionsInput, UserUncheckedCreateWithoutDecisionsInput>
    connectOrCreate?: UserCreateOrConnectWithoutDecisionsInput
    connect?: UserWhereUniqueInput
  }

  export type EnumSelectedOptionFieldUpdateOperationsInput = {
    set?: $Enums.SelectedOption
  }

  export type CrisisUpdateOneRequiredWithoutDecisionsNestedInput = {
    create?: XOR<CrisisCreateWithoutDecisionsInput, CrisisUncheckedCreateWithoutDecisionsInput>
    connectOrCreate?: CrisisCreateOrConnectWithoutDecisionsInput
    upsert?: CrisisUpsertWithoutDecisionsInput
    connect?: CrisisWhereUniqueInput
    update?: XOR<XOR<CrisisUpdateToOneWithWhereWithoutDecisionsInput, CrisisUpdateWithoutDecisionsInput>, CrisisUncheckedUpdateWithoutDecisionsInput>
  }

  export type UserUpdateOneRequiredWithoutDecisionsNestedInput = {
    create?: XOR<UserCreateWithoutDecisionsInput, UserUncheckedCreateWithoutDecisionsInput>
    connectOrCreate?: UserCreateOrConnectWithoutDecisionsInput
    upsert?: UserUpsertWithoutDecisionsInput
    connect?: UserWhereUniqueInput
    update?: XOR<XOR<UserUpdateToOneWithWhereWithoutDecisionsInput, UserUpdateWithoutDecisionsInput>, UserUncheckedUpdateWithoutDecisionsInput>
  }

  export type CrisisCreateNestedOneWithoutAlertsInput = {
    create?: XOR<CrisisCreateWithoutAlertsInput, CrisisUncheckedCreateWithoutAlertsInput>
    connectOrCreate?: CrisisCreateOrConnectWithoutAlertsInput
    connect?: CrisisWhereUniqueInput
  }

  export type EnumAlertTypeFieldUpdateOperationsInput = {
    set?: $Enums.AlertType
  }

  export type EnumAlertSeverityFieldUpdateOperationsInput = {
    set?: $Enums.AlertSeverity
  }

  export type CrisisUpdateOneRequiredWithoutAlertsNestedInput = {
    create?: XOR<CrisisCreateWithoutAlertsInput, CrisisUncheckedCreateWithoutAlertsInput>
    connectOrCreate?: CrisisCreateOrConnectWithoutAlertsInput
    upsert?: CrisisUpsertWithoutAlertsInput
    connect?: CrisisWhereUniqueInput
    update?: XOR<XOR<CrisisUpdateToOneWithWhereWithoutAlertsInput, CrisisUpdateWithoutAlertsInput>, CrisisUncheckedUpdateWithoutAlertsInput>
  }

  export type UserCreateNestedOneWithoutAuditDecisionsInput = {
    create?: XOR<UserCreateWithoutAuditDecisionsInput, UserUncheckedCreateWithoutAuditDecisionsInput>
    connectOrCreate?: UserCreateOrConnectWithoutAuditDecisionsInput
    connect?: UserWhereUniqueInput
  }

  export type EvidenceCreateNestedManyWithoutAuditDecisionInput = {
    create?: XOR<EvidenceCreateWithoutAuditDecisionInput, EvidenceUncheckedCreateWithoutAuditDecisionInput> | EvidenceCreateWithoutAuditDecisionInput[] | EvidenceUncheckedCreateWithoutAuditDecisionInput[]
    connectOrCreate?: EvidenceCreateOrConnectWithoutAuditDecisionInput | EvidenceCreateOrConnectWithoutAuditDecisionInput[]
    createMany?: EvidenceCreateManyAuditDecisionInputEnvelope
    connect?: EvidenceWhereUniqueInput | EvidenceWhereUniqueInput[]
  }

  export type EvidenceUncheckedCreateNestedManyWithoutAuditDecisionInput = {
    create?: XOR<EvidenceCreateWithoutAuditDecisionInput, EvidenceUncheckedCreateWithoutAuditDecisionInput> | EvidenceCreateWithoutAuditDecisionInput[] | EvidenceUncheckedCreateWithoutAuditDecisionInput[]
    connectOrCreate?: EvidenceCreateOrConnectWithoutAuditDecisionInput | EvidenceCreateOrConnectWithoutAuditDecisionInput[]
    createMany?: EvidenceCreateManyAuditDecisionInputEnvelope
    connect?: EvidenceWhereUniqueInput | EvidenceWhereUniqueInput[]
  }

  export type EnumAuditDecisionTypeFieldUpdateOperationsInput = {
    set?: $Enums.AuditDecisionType
  }

  export type EnumRiskLevelFieldUpdateOperationsInput = {
    set?: $Enums.RiskLevel
  }

  export type EnumAuditStatusFieldUpdateOperationsInput = {
    set?: $Enums.AuditStatus
  }

  export type EnumSyncStatusFieldUpdateOperationsInput = {
    set?: $Enums.SyncStatus
  }

  export type EnumPriorityFieldUpdateOperationsInput = {
    set?: $Enums.Priority
  }

  export type UserUpdateOneRequiredWithoutAuditDecisionsNestedInput = {
    create?: XOR<UserCreateWithoutAuditDecisionsInput, UserUncheckedCreateWithoutAuditDecisionsInput>
    connectOrCreate?: UserCreateOrConnectWithoutAuditDecisionsInput
    upsert?: UserUpsertWithoutAuditDecisionsInput
    connect?: UserWhereUniqueInput
    update?: XOR<XOR<UserUpdateToOneWithWhereWithoutAuditDecisionsInput, UserUpdateWithoutAuditDecisionsInput>, UserUncheckedUpdateWithoutAuditDecisionsInput>
  }

  export type EvidenceUpdateManyWithoutAuditDecisionNestedInput = {
    create?: XOR<EvidenceCreateWithoutAuditDecisionInput, EvidenceUncheckedCreateWithoutAuditDecisionInput> | EvidenceCreateWithoutAuditDecisionInput[] | EvidenceUncheckedCreateWithoutAuditDecisionInput[]
    connectOrCreate?: EvidenceCreateOrConnectWithoutAuditDecisionInput | EvidenceCreateOrConnectWithoutAuditDecisionInput[]
    upsert?: EvidenceUpsertWithWhereUniqueWithoutAuditDecisionInput | EvidenceUpsertWithWhereUniqueWithoutAuditDecisionInput[]
    createMany?: EvidenceCreateManyAuditDecisionInputEnvelope
    set?: EvidenceWhereUniqueInput | EvidenceWhereUniqueInput[]
    disconnect?: EvidenceWhereUniqueInput | EvidenceWhereUniqueInput[]
    delete?: EvidenceWhereUniqueInput | EvidenceWhereUniqueInput[]
    connect?: EvidenceWhereUniqueInput | EvidenceWhereUniqueInput[]
    update?: EvidenceUpdateWithWhereUniqueWithoutAuditDecisionInput | EvidenceUpdateWithWhereUniqueWithoutAuditDecisionInput[]
    updateMany?: EvidenceUpdateManyWithWhereWithoutAuditDecisionInput | EvidenceUpdateManyWithWhereWithoutAuditDecisionInput[]
    deleteMany?: EvidenceScalarWhereInput | EvidenceScalarWhereInput[]
  }

  export type EvidenceUncheckedUpdateManyWithoutAuditDecisionNestedInput = {
    create?: XOR<EvidenceCreateWithoutAuditDecisionInput, EvidenceUncheckedCreateWithoutAuditDecisionInput> | EvidenceCreateWithoutAuditDecisionInput[] | EvidenceUncheckedCreateWithoutAuditDecisionInput[]
    connectOrCreate?: EvidenceCreateOrConnectWithoutAuditDecisionInput | EvidenceCreateOrConnectWithoutAuditDecisionInput[]
    upsert?: EvidenceUpsertWithWhereUniqueWithoutAuditDecisionInput | EvidenceUpsertWithWhereUniqueWithoutAuditDecisionInput[]
    createMany?: EvidenceCreateManyAuditDecisionInputEnvelope
    set?: EvidenceWhereUniqueInput | EvidenceWhereUniqueInput[]
    disconnect?: EvidenceWhereUniqueInput | EvidenceWhereUniqueInput[]
    delete?: EvidenceWhereUniqueInput | EvidenceWhereUniqueInput[]
    connect?: EvidenceWhereUniqueInput | EvidenceWhereUniqueInput[]
    update?: EvidenceUpdateWithWhereUniqueWithoutAuditDecisionInput | EvidenceUpdateWithWhereUniqueWithoutAuditDecisionInput[]
    updateMany?: EvidenceUpdateManyWithWhereWithoutAuditDecisionInput | EvidenceUpdateManyWithWhereWithoutAuditDecisionInput[]
    deleteMany?: EvidenceScalarWhereInput | EvidenceScalarWhereInput[]
  }

  export type AuditDecisionCreateNestedOneWithoutEvidenceInput = {
    create?: XOR<AuditDecisionCreateWithoutEvidenceInput, AuditDecisionUncheckedCreateWithoutEvidenceInput>
    connectOrCreate?: AuditDecisionCreateOrConnectWithoutEvidenceInput
    connect?: AuditDecisionWhereUniqueInput
  }

  export type EnumEvidenceTypeFieldUpdateOperationsInput = {
    set?: $Enums.EvidenceType
  }

  export type AuditDecisionUpdateOneRequiredWithoutEvidenceNestedInput = {
    create?: XOR<AuditDecisionCreateWithoutEvidenceInput, AuditDecisionUncheckedCreateWithoutEvidenceInput>
    connectOrCreate?: AuditDecisionCreateOrConnectWithoutEvidenceInput
    upsert?: AuditDecisionUpsertWithoutEvidenceInput
    connect?: AuditDecisionWhereUniqueInput
    update?: XOR<XOR<AuditDecisionUpdateToOneWithWhereWithoutEvidenceInput, AuditDecisionUpdateWithoutEvidenceInput>, AuditDecisionUncheckedUpdateWithoutEvidenceInput>
  }

  export type NestedStringFilter<$PrismaModel = never> = {
    equals?: string | StringFieldRefInput<$PrismaModel>
    in?: string[] | ListStringFieldRefInput<$PrismaModel>
    notIn?: string[] | ListStringFieldRefInput<$PrismaModel>
    lt?: string | StringFieldRefInput<$PrismaModel>
    lte?: string | StringFieldRefInput<$PrismaModel>
    gt?: string | StringFieldRefInput<$PrismaModel>
    gte?: string | StringFieldRefInput<$PrismaModel>
    contains?: string | StringFieldRefInput<$PrismaModel>
    startsWith?: string | StringFieldRefInput<$PrismaModel>
    endsWith?: string | StringFieldRefInput<$PrismaModel>
    not?: NestedStringFilter<$PrismaModel> | string
  }

  export type NestedBoolFilter<$PrismaModel = never> = {
    equals?: boolean | BooleanFieldRefInput<$PrismaModel>
    not?: NestedBoolFilter<$PrismaModel> | boolean
  }

  export type NestedStringNullableFilter<$PrismaModel = never> = {
    equals?: string | StringFieldRefInput<$PrismaModel> | null
    in?: string[] | ListStringFieldRefInput<$PrismaModel> | null
    notIn?: string[] | ListStringFieldRefInput<$PrismaModel> | null
    lt?: string | StringFieldRefInput<$PrismaModel>
    lte?: string | StringFieldRefInput<$PrismaModel>
    gt?: string | StringFieldRefInput<$PrismaModel>
    gte?: string | StringFieldRefInput<$PrismaModel>
    contains?: string | StringFieldRefInput<$PrismaModel>
    startsWith?: string | StringFieldRefInput<$PrismaModel>
    endsWith?: string | StringFieldRefInput<$PrismaModel>
    not?: NestedStringNullableFilter<$PrismaModel> | string | null
  }

  export type NestedDateTimeFilter<$PrismaModel = never> = {
    equals?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    in?: Date[] | string[] | ListDateTimeFieldRefInput<$PrismaModel>
    notIn?: Date[] | string[] | ListDateTimeFieldRefInput<$PrismaModel>
    lt?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    lte?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    gt?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    gte?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    not?: NestedDateTimeFilter<$PrismaModel> | Date | string
  }

  export type NestedEnumUserRoleFilter<$PrismaModel = never> = {
    equals?: $Enums.UserRole | EnumUserRoleFieldRefInput<$PrismaModel>
    in?: $Enums.UserRole[] | ListEnumUserRoleFieldRefInput<$PrismaModel>
    notIn?: $Enums.UserRole[] | ListEnumUserRoleFieldRefInput<$PrismaModel>
    not?: NestedEnumUserRoleFilter<$PrismaModel> | $Enums.UserRole
  }

  export type NestedStringWithAggregatesFilter<$PrismaModel = never> = {
    equals?: string | StringFieldRefInput<$PrismaModel>
    in?: string[] | ListStringFieldRefInput<$PrismaModel>
    notIn?: string[] | ListStringFieldRefInput<$PrismaModel>
    lt?: string | StringFieldRefInput<$PrismaModel>
    lte?: string | StringFieldRefInput<$PrismaModel>
    gt?: string | StringFieldRefInput<$PrismaModel>
    gte?: string | StringFieldRefInput<$PrismaModel>
    contains?: string | StringFieldRefInput<$PrismaModel>
    startsWith?: string | StringFieldRefInput<$PrismaModel>
    endsWith?: string | StringFieldRefInput<$PrismaModel>
    not?: NestedStringWithAggregatesFilter<$PrismaModel> | string
    _count?: NestedIntFilter<$PrismaModel>
    _min?: NestedStringFilter<$PrismaModel>
    _max?: NestedStringFilter<$PrismaModel>
  }

  export type NestedIntFilter<$PrismaModel = never> = {
    equals?: number | IntFieldRefInput<$PrismaModel>
    in?: number[] | ListIntFieldRefInput<$PrismaModel>
    notIn?: number[] | ListIntFieldRefInput<$PrismaModel>
    lt?: number | IntFieldRefInput<$PrismaModel>
    lte?: number | IntFieldRefInput<$PrismaModel>
    gt?: number | IntFieldRefInput<$PrismaModel>
    gte?: number | IntFieldRefInput<$PrismaModel>
    not?: NestedIntFilter<$PrismaModel> | number
  }

  export type NestedBoolWithAggregatesFilter<$PrismaModel = never> = {
    equals?: boolean | BooleanFieldRefInput<$PrismaModel>
    not?: NestedBoolWithAggregatesFilter<$PrismaModel> | boolean
    _count?: NestedIntFilter<$PrismaModel>
    _min?: NestedBoolFilter<$PrismaModel>
    _max?: NestedBoolFilter<$PrismaModel>
  }

  export type NestedStringNullableWithAggregatesFilter<$PrismaModel = never> = {
    equals?: string | StringFieldRefInput<$PrismaModel> | null
    in?: string[] | ListStringFieldRefInput<$PrismaModel> | null
    notIn?: string[] | ListStringFieldRefInput<$PrismaModel> | null
    lt?: string | StringFieldRefInput<$PrismaModel>
    lte?: string | StringFieldRefInput<$PrismaModel>
    gt?: string | StringFieldRefInput<$PrismaModel>
    gte?: string | StringFieldRefInput<$PrismaModel>
    contains?: string | StringFieldRefInput<$PrismaModel>
    startsWith?: string | StringFieldRefInput<$PrismaModel>
    endsWith?: string | StringFieldRefInput<$PrismaModel>
    not?: NestedStringNullableWithAggregatesFilter<$PrismaModel> | string | null
    _count?: NestedIntNullableFilter<$PrismaModel>
    _min?: NestedStringNullableFilter<$PrismaModel>
    _max?: NestedStringNullableFilter<$PrismaModel>
  }

  export type NestedIntNullableFilter<$PrismaModel = never> = {
    equals?: number | IntFieldRefInput<$PrismaModel> | null
    in?: number[] | ListIntFieldRefInput<$PrismaModel> | null
    notIn?: number[] | ListIntFieldRefInput<$PrismaModel> | null
    lt?: number | IntFieldRefInput<$PrismaModel>
    lte?: number | IntFieldRefInput<$PrismaModel>
    gt?: number | IntFieldRefInput<$PrismaModel>
    gte?: number | IntFieldRefInput<$PrismaModel>
    not?: NestedIntNullableFilter<$PrismaModel> | number | null
  }

  export type NestedDateTimeWithAggregatesFilter<$PrismaModel = never> = {
    equals?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    in?: Date[] | string[] | ListDateTimeFieldRefInput<$PrismaModel>
    notIn?: Date[] | string[] | ListDateTimeFieldRefInput<$PrismaModel>
    lt?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    lte?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    gt?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    gte?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    not?: NestedDateTimeWithAggregatesFilter<$PrismaModel> | Date | string
    _count?: NestedIntFilter<$PrismaModel>
    _min?: NestedDateTimeFilter<$PrismaModel>
    _max?: NestedDateTimeFilter<$PrismaModel>
  }

  export type NestedEnumUserRoleWithAggregatesFilter<$PrismaModel = never> = {
    equals?: $Enums.UserRole | EnumUserRoleFieldRefInput<$PrismaModel>
    in?: $Enums.UserRole[] | ListEnumUserRoleFieldRefInput<$PrismaModel>
    notIn?: $Enums.UserRole[] | ListEnumUserRoleFieldRefInput<$PrismaModel>
    not?: NestedEnumUserRoleWithAggregatesFilter<$PrismaModel> | $Enums.UserRole
    _count?: NestedIntFilter<$PrismaModel>
    _min?: NestedEnumUserRoleFilter<$PrismaModel>
    _max?: NestedEnumUserRoleFilter<$PrismaModel>
  }

  export type NestedDateTimeNullableFilter<$PrismaModel = never> = {
    equals?: Date | string | DateTimeFieldRefInput<$PrismaModel> | null
    in?: Date[] | string[] | ListDateTimeFieldRefInput<$PrismaModel> | null
    notIn?: Date[] | string[] | ListDateTimeFieldRefInput<$PrismaModel> | null
    lt?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    lte?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    gt?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    gte?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    not?: NestedDateTimeNullableFilter<$PrismaModel> | Date | string | null
  }

  export type NestedDateTimeNullableWithAggregatesFilter<$PrismaModel = never> = {
    equals?: Date | string | DateTimeFieldRefInput<$PrismaModel> | null
    in?: Date[] | string[] | ListDateTimeFieldRefInput<$PrismaModel> | null
    notIn?: Date[] | string[] | ListDateTimeFieldRefInput<$PrismaModel> | null
    lt?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    lte?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    gt?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    gte?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    not?: NestedDateTimeNullableWithAggregatesFilter<$PrismaModel> | Date | string | null
    _count?: NestedIntNullableFilter<$PrismaModel>
    _min?: NestedDateTimeNullableFilter<$PrismaModel>
    _max?: NestedDateTimeNullableFilter<$PrismaModel>
  }

  export type NestedEnumCrisisTypeFilter<$PrismaModel = never> = {
    equals?: $Enums.CrisisType | EnumCrisisTypeFieldRefInput<$PrismaModel>
    in?: $Enums.CrisisType[] | ListEnumCrisisTypeFieldRefInput<$PrismaModel>
    notIn?: $Enums.CrisisType[] | ListEnumCrisisTypeFieldRefInput<$PrismaModel>
    not?: NestedEnumCrisisTypeFilter<$PrismaModel> | $Enums.CrisisType
  }

  export type NestedEnumCrisisSeverityFilter<$PrismaModel = never> = {
    equals?: $Enums.CrisisSeverity | EnumCrisisSeverityFieldRefInput<$PrismaModel>
    in?: $Enums.CrisisSeverity[] | ListEnumCrisisSeverityFieldRefInput<$PrismaModel>
    notIn?: $Enums.CrisisSeverity[] | ListEnumCrisisSeverityFieldRefInput<$PrismaModel>
    not?: NestedEnumCrisisSeverityFilter<$PrismaModel> | $Enums.CrisisSeverity
  }

  export type NestedFloatNullableFilter<$PrismaModel = never> = {
    equals?: number | FloatFieldRefInput<$PrismaModel> | null
    in?: number[] | ListFloatFieldRefInput<$PrismaModel> | null
    notIn?: number[] | ListFloatFieldRefInput<$PrismaModel> | null
    lt?: number | FloatFieldRefInput<$PrismaModel>
    lte?: number | FloatFieldRefInput<$PrismaModel>
    gt?: number | FloatFieldRefInput<$PrismaModel>
    gte?: number | FloatFieldRefInput<$PrismaModel>
    not?: NestedFloatNullableFilter<$PrismaModel> | number | null
  }

  export type NestedEnumCrisisStatusFilter<$PrismaModel = never> = {
    equals?: $Enums.CrisisStatus | EnumCrisisStatusFieldRefInput<$PrismaModel>
    in?: $Enums.CrisisStatus[] | ListEnumCrisisStatusFieldRefInput<$PrismaModel>
    notIn?: $Enums.CrisisStatus[] | ListEnumCrisisStatusFieldRefInput<$PrismaModel>
    not?: NestedEnumCrisisStatusFilter<$PrismaModel> | $Enums.CrisisStatus
  }

  export type NestedEnumCrisisTypeWithAggregatesFilter<$PrismaModel = never> = {
    equals?: $Enums.CrisisType | EnumCrisisTypeFieldRefInput<$PrismaModel>
    in?: $Enums.CrisisType[] | ListEnumCrisisTypeFieldRefInput<$PrismaModel>
    notIn?: $Enums.CrisisType[] | ListEnumCrisisTypeFieldRefInput<$PrismaModel>
    not?: NestedEnumCrisisTypeWithAggregatesFilter<$PrismaModel> | $Enums.CrisisType
    _count?: NestedIntFilter<$PrismaModel>
    _min?: NestedEnumCrisisTypeFilter<$PrismaModel>
    _max?: NestedEnumCrisisTypeFilter<$PrismaModel>
  }

  export type NestedEnumCrisisSeverityWithAggregatesFilter<$PrismaModel = never> = {
    equals?: $Enums.CrisisSeverity | EnumCrisisSeverityFieldRefInput<$PrismaModel>
    in?: $Enums.CrisisSeverity[] | ListEnumCrisisSeverityFieldRefInput<$PrismaModel>
    notIn?: $Enums.CrisisSeverity[] | ListEnumCrisisSeverityFieldRefInput<$PrismaModel>
    not?: NestedEnumCrisisSeverityWithAggregatesFilter<$PrismaModel> | $Enums.CrisisSeverity
    _count?: NestedIntFilter<$PrismaModel>
    _min?: NestedEnumCrisisSeverityFilter<$PrismaModel>
    _max?: NestedEnumCrisisSeverityFilter<$PrismaModel>
  }

  export type NestedFloatNullableWithAggregatesFilter<$PrismaModel = never> = {
    equals?: number | FloatFieldRefInput<$PrismaModel> | null
    in?: number[] | ListFloatFieldRefInput<$PrismaModel> | null
    notIn?: number[] | ListFloatFieldRefInput<$PrismaModel> | null
    lt?: number | FloatFieldRefInput<$PrismaModel>
    lte?: number | FloatFieldRefInput<$PrismaModel>
    gt?: number | FloatFieldRefInput<$PrismaModel>
    gte?: number | FloatFieldRefInput<$PrismaModel>
    not?: NestedFloatNullableWithAggregatesFilter<$PrismaModel> | number | null
    _count?: NestedIntNullableFilter<$PrismaModel>
    _avg?: NestedFloatNullableFilter<$PrismaModel>
    _sum?: NestedFloatNullableFilter<$PrismaModel>
    _min?: NestedFloatNullableFilter<$PrismaModel>
    _max?: NestedFloatNullableFilter<$PrismaModel>
  }

  export type NestedIntWithAggregatesFilter<$PrismaModel = never> = {
    equals?: number | IntFieldRefInput<$PrismaModel>
    in?: number[] | ListIntFieldRefInput<$PrismaModel>
    notIn?: number[] | ListIntFieldRefInput<$PrismaModel>
    lt?: number | IntFieldRefInput<$PrismaModel>
    lte?: number | IntFieldRefInput<$PrismaModel>
    gt?: number | IntFieldRefInput<$PrismaModel>
    gte?: number | IntFieldRefInput<$PrismaModel>
    not?: NestedIntWithAggregatesFilter<$PrismaModel> | number
    _count?: NestedIntFilter<$PrismaModel>
    _avg?: NestedFloatFilter<$PrismaModel>
    _sum?: NestedIntFilter<$PrismaModel>
    _min?: NestedIntFilter<$PrismaModel>
    _max?: NestedIntFilter<$PrismaModel>
  }

  export type NestedFloatFilter<$PrismaModel = never> = {
    equals?: number | FloatFieldRefInput<$PrismaModel>
    in?: number[] | ListFloatFieldRefInput<$PrismaModel>
    notIn?: number[] | ListFloatFieldRefInput<$PrismaModel>
    lt?: number | FloatFieldRefInput<$PrismaModel>
    lte?: number | FloatFieldRefInput<$PrismaModel>
    gt?: number | FloatFieldRefInput<$PrismaModel>
    gte?: number | FloatFieldRefInput<$PrismaModel>
    not?: NestedFloatFilter<$PrismaModel> | number
  }

  export type NestedEnumCrisisStatusWithAggregatesFilter<$PrismaModel = never> = {
    equals?: $Enums.CrisisStatus | EnumCrisisStatusFieldRefInput<$PrismaModel>
    in?: $Enums.CrisisStatus[] | ListEnumCrisisStatusFieldRefInput<$PrismaModel>
    notIn?: $Enums.CrisisStatus[] | ListEnumCrisisStatusFieldRefInput<$PrismaModel>
    not?: NestedEnumCrisisStatusWithAggregatesFilter<$PrismaModel> | $Enums.CrisisStatus
    _count?: NestedIntFilter<$PrismaModel>
    _min?: NestedEnumCrisisStatusFilter<$PrismaModel>
    _max?: NestedEnumCrisisStatusFilter<$PrismaModel>
  }

  export type NestedEnumSelectedOptionFilter<$PrismaModel = never> = {
    equals?: $Enums.SelectedOption | EnumSelectedOptionFieldRefInput<$PrismaModel>
    in?: $Enums.SelectedOption[] | ListEnumSelectedOptionFieldRefInput<$PrismaModel>
    notIn?: $Enums.SelectedOption[] | ListEnumSelectedOptionFieldRefInput<$PrismaModel>
    not?: NestedEnumSelectedOptionFilter<$PrismaModel> | $Enums.SelectedOption
  }

  export type NestedEnumSelectedOptionWithAggregatesFilter<$PrismaModel = never> = {
    equals?: $Enums.SelectedOption | EnumSelectedOptionFieldRefInput<$PrismaModel>
    in?: $Enums.SelectedOption[] | ListEnumSelectedOptionFieldRefInput<$PrismaModel>
    notIn?: $Enums.SelectedOption[] | ListEnumSelectedOptionFieldRefInput<$PrismaModel>
    not?: NestedEnumSelectedOptionWithAggregatesFilter<$PrismaModel> | $Enums.SelectedOption
    _count?: NestedIntFilter<$PrismaModel>
    _min?: NestedEnumSelectedOptionFilter<$PrismaModel>
    _max?: NestedEnumSelectedOptionFilter<$PrismaModel>
  }

  export type NestedEnumAlertTypeFilter<$PrismaModel = never> = {
    equals?: $Enums.AlertType | EnumAlertTypeFieldRefInput<$PrismaModel>
    in?: $Enums.AlertType[] | ListEnumAlertTypeFieldRefInput<$PrismaModel>
    notIn?: $Enums.AlertType[] | ListEnumAlertTypeFieldRefInput<$PrismaModel>
    not?: NestedEnumAlertTypeFilter<$PrismaModel> | $Enums.AlertType
  }

  export type NestedEnumAlertSeverityFilter<$PrismaModel = never> = {
    equals?: $Enums.AlertSeverity | EnumAlertSeverityFieldRefInput<$PrismaModel>
    in?: $Enums.AlertSeverity[] | ListEnumAlertSeverityFieldRefInput<$PrismaModel>
    notIn?: $Enums.AlertSeverity[] | ListEnumAlertSeverityFieldRefInput<$PrismaModel>
    not?: NestedEnumAlertSeverityFilter<$PrismaModel> | $Enums.AlertSeverity
  }

  export type NestedEnumAlertTypeWithAggregatesFilter<$PrismaModel = never> = {
    equals?: $Enums.AlertType | EnumAlertTypeFieldRefInput<$PrismaModel>
    in?: $Enums.AlertType[] | ListEnumAlertTypeFieldRefInput<$PrismaModel>
    notIn?: $Enums.AlertType[] | ListEnumAlertTypeFieldRefInput<$PrismaModel>
    not?: NestedEnumAlertTypeWithAggregatesFilter<$PrismaModel> | $Enums.AlertType
    _count?: NestedIntFilter<$PrismaModel>
    _min?: NestedEnumAlertTypeFilter<$PrismaModel>
    _max?: NestedEnumAlertTypeFilter<$PrismaModel>
  }

  export type NestedEnumAlertSeverityWithAggregatesFilter<$PrismaModel = never> = {
    equals?: $Enums.AlertSeverity | EnumAlertSeverityFieldRefInput<$PrismaModel>
    in?: $Enums.AlertSeverity[] | ListEnumAlertSeverityFieldRefInput<$PrismaModel>
    notIn?: $Enums.AlertSeverity[] | ListEnumAlertSeverityFieldRefInput<$PrismaModel>
    not?: NestedEnumAlertSeverityWithAggregatesFilter<$PrismaModel> | $Enums.AlertSeverity
    _count?: NestedIntFilter<$PrismaModel>
    _min?: NestedEnumAlertSeverityFilter<$PrismaModel>
    _max?: NestedEnumAlertSeverityFilter<$PrismaModel>
  }

  export type NestedEnumAuditDecisionTypeFilter<$PrismaModel = never> = {
    equals?: $Enums.AuditDecisionType | EnumAuditDecisionTypeFieldRefInput<$PrismaModel>
    in?: $Enums.AuditDecisionType[] | ListEnumAuditDecisionTypeFieldRefInput<$PrismaModel>
    notIn?: $Enums.AuditDecisionType[] | ListEnumAuditDecisionTypeFieldRefInput<$PrismaModel>
    not?: NestedEnumAuditDecisionTypeFilter<$PrismaModel> | $Enums.AuditDecisionType
  }

  export type NestedEnumRiskLevelFilter<$PrismaModel = never> = {
    equals?: $Enums.RiskLevel | EnumRiskLevelFieldRefInput<$PrismaModel>
    in?: $Enums.RiskLevel[] | ListEnumRiskLevelFieldRefInput<$PrismaModel>
    notIn?: $Enums.RiskLevel[] | ListEnumRiskLevelFieldRefInput<$PrismaModel>
    not?: NestedEnumRiskLevelFilter<$PrismaModel> | $Enums.RiskLevel
  }

  export type NestedEnumAuditStatusFilter<$PrismaModel = never> = {
    equals?: $Enums.AuditStatus | EnumAuditStatusFieldRefInput<$PrismaModel>
    in?: $Enums.AuditStatus[] | ListEnumAuditStatusFieldRefInput<$PrismaModel>
    notIn?: $Enums.AuditStatus[] | ListEnumAuditStatusFieldRefInput<$PrismaModel>
    not?: NestedEnumAuditStatusFilter<$PrismaModel> | $Enums.AuditStatus
  }

  export type NestedEnumSyncStatusFilter<$PrismaModel = never> = {
    equals?: $Enums.SyncStatus | EnumSyncStatusFieldRefInput<$PrismaModel>
    in?: $Enums.SyncStatus[] | ListEnumSyncStatusFieldRefInput<$PrismaModel>
    notIn?: $Enums.SyncStatus[] | ListEnumSyncStatusFieldRefInput<$PrismaModel>
    not?: NestedEnumSyncStatusFilter<$PrismaModel> | $Enums.SyncStatus
  }

  export type NestedEnumPriorityFilter<$PrismaModel = never> = {
    equals?: $Enums.Priority | EnumPriorityFieldRefInput<$PrismaModel>
    in?: $Enums.Priority[] | ListEnumPriorityFieldRefInput<$PrismaModel>
    notIn?: $Enums.Priority[] | ListEnumPriorityFieldRefInput<$PrismaModel>
    not?: NestedEnumPriorityFilter<$PrismaModel> | $Enums.Priority
  }

  export type NestedEnumAuditDecisionTypeWithAggregatesFilter<$PrismaModel = never> = {
    equals?: $Enums.AuditDecisionType | EnumAuditDecisionTypeFieldRefInput<$PrismaModel>
    in?: $Enums.AuditDecisionType[] | ListEnumAuditDecisionTypeFieldRefInput<$PrismaModel>
    notIn?: $Enums.AuditDecisionType[] | ListEnumAuditDecisionTypeFieldRefInput<$PrismaModel>
    not?: NestedEnumAuditDecisionTypeWithAggregatesFilter<$PrismaModel> | $Enums.AuditDecisionType
    _count?: NestedIntFilter<$PrismaModel>
    _min?: NestedEnumAuditDecisionTypeFilter<$PrismaModel>
    _max?: NestedEnumAuditDecisionTypeFilter<$PrismaModel>
  }

  export type NestedEnumRiskLevelWithAggregatesFilter<$PrismaModel = never> = {
    equals?: $Enums.RiskLevel | EnumRiskLevelFieldRefInput<$PrismaModel>
    in?: $Enums.RiskLevel[] | ListEnumRiskLevelFieldRefInput<$PrismaModel>
    notIn?: $Enums.RiskLevel[] | ListEnumRiskLevelFieldRefInput<$PrismaModel>
    not?: NestedEnumRiskLevelWithAggregatesFilter<$PrismaModel> | $Enums.RiskLevel
    _count?: NestedIntFilter<$PrismaModel>
    _min?: NestedEnumRiskLevelFilter<$PrismaModel>
    _max?: NestedEnumRiskLevelFilter<$PrismaModel>
  }
  export type NestedJsonFilter<$PrismaModel = never> =
    | PatchUndefined<
        Either<Required<NestedJsonFilterBase<$PrismaModel>>, Exclude<keyof Required<NestedJsonFilterBase<$PrismaModel>>, 'path'>>,
        Required<NestedJsonFilterBase<$PrismaModel>>
      >
    | OptionalFlat<Omit<Required<NestedJsonFilterBase<$PrismaModel>>, 'path'>>

  export type NestedJsonFilterBase<$PrismaModel = never> = {
    equals?: InputJsonValue | JsonFieldRefInput<$PrismaModel> | JsonNullValueFilter
    path?: string[]
    mode?: QueryMode | EnumQueryModeFieldRefInput<$PrismaModel>
    string_contains?: string | StringFieldRefInput<$PrismaModel>
    string_starts_with?: string | StringFieldRefInput<$PrismaModel>
    string_ends_with?: string | StringFieldRefInput<$PrismaModel>
    array_starts_with?: InputJsonValue | JsonFieldRefInput<$PrismaModel> | null
    array_ends_with?: InputJsonValue | JsonFieldRefInput<$PrismaModel> | null
    array_contains?: InputJsonValue | JsonFieldRefInput<$PrismaModel> | null
    lt?: InputJsonValue | JsonFieldRefInput<$PrismaModel>
    lte?: InputJsonValue | JsonFieldRefInput<$PrismaModel>
    gt?: InputJsonValue | JsonFieldRefInput<$PrismaModel>
    gte?: InputJsonValue | JsonFieldRefInput<$PrismaModel>
    not?: InputJsonValue | JsonFieldRefInput<$PrismaModel> | JsonNullValueFilter
  }

  export type NestedEnumAuditStatusWithAggregatesFilter<$PrismaModel = never> = {
    equals?: $Enums.AuditStatus | EnumAuditStatusFieldRefInput<$PrismaModel>
    in?: $Enums.AuditStatus[] | ListEnumAuditStatusFieldRefInput<$PrismaModel>
    notIn?: $Enums.AuditStatus[] | ListEnumAuditStatusFieldRefInput<$PrismaModel>
    not?: NestedEnumAuditStatusWithAggregatesFilter<$PrismaModel> | $Enums.AuditStatus
    _count?: NestedIntFilter<$PrismaModel>
    _min?: NestedEnumAuditStatusFilter<$PrismaModel>
    _max?: NestedEnumAuditStatusFilter<$PrismaModel>
  }

  export type NestedEnumSyncStatusWithAggregatesFilter<$PrismaModel = never> = {
    equals?: $Enums.SyncStatus | EnumSyncStatusFieldRefInput<$PrismaModel>
    in?: $Enums.SyncStatus[] | ListEnumSyncStatusFieldRefInput<$PrismaModel>
    notIn?: $Enums.SyncStatus[] | ListEnumSyncStatusFieldRefInput<$PrismaModel>
    not?: NestedEnumSyncStatusWithAggregatesFilter<$PrismaModel> | $Enums.SyncStatus
    _count?: NestedIntFilter<$PrismaModel>
    _min?: NestedEnumSyncStatusFilter<$PrismaModel>
    _max?: NestedEnumSyncStatusFilter<$PrismaModel>
  }

  export type NestedEnumPriorityWithAggregatesFilter<$PrismaModel = never> = {
    equals?: $Enums.Priority | EnumPriorityFieldRefInput<$PrismaModel>
    in?: $Enums.Priority[] | ListEnumPriorityFieldRefInput<$PrismaModel>
    notIn?: $Enums.Priority[] | ListEnumPriorityFieldRefInput<$PrismaModel>
    not?: NestedEnumPriorityWithAggregatesFilter<$PrismaModel> | $Enums.Priority
    _count?: NestedIntFilter<$PrismaModel>
    _min?: NestedEnumPriorityFilter<$PrismaModel>
    _max?: NestedEnumPriorityFilter<$PrismaModel>
  }

  export type NestedEnumEvidenceTypeFilter<$PrismaModel = never> = {
    equals?: $Enums.EvidenceType | EnumEvidenceTypeFieldRefInput<$PrismaModel>
    in?: $Enums.EvidenceType[] | ListEnumEvidenceTypeFieldRefInput<$PrismaModel>
    notIn?: $Enums.EvidenceType[] | ListEnumEvidenceTypeFieldRefInput<$PrismaModel>
    not?: NestedEnumEvidenceTypeFilter<$PrismaModel> | $Enums.EvidenceType
  }

  export type NestedEnumEvidenceTypeWithAggregatesFilter<$PrismaModel = never> = {
    equals?: $Enums.EvidenceType | EnumEvidenceTypeFieldRefInput<$PrismaModel>
    in?: $Enums.EvidenceType[] | ListEnumEvidenceTypeFieldRefInput<$PrismaModel>
    notIn?: $Enums.EvidenceType[] | ListEnumEvidenceTypeFieldRefInput<$PrismaModel>
    not?: NestedEnumEvidenceTypeWithAggregatesFilter<$PrismaModel> | $Enums.EvidenceType
    _count?: NestedIntFilter<$PrismaModel>
    _min?: NestedEnumEvidenceTypeFilter<$PrismaModel>
    _max?: NestedEnumEvidenceTypeFilter<$PrismaModel>
  }
  export type NestedJsonNullableFilter<$PrismaModel = never> =
    | PatchUndefined<
        Either<Required<NestedJsonNullableFilterBase<$PrismaModel>>, Exclude<keyof Required<NestedJsonNullableFilterBase<$PrismaModel>>, 'path'>>,
        Required<NestedJsonNullableFilterBase<$PrismaModel>>
      >
    | OptionalFlat<Omit<Required<NestedJsonNullableFilterBase<$PrismaModel>>, 'path'>>

  export type NestedJsonNullableFilterBase<$PrismaModel = never> = {
    equals?: InputJsonValue | JsonFieldRefInput<$PrismaModel> | JsonNullValueFilter
    path?: string[]
    mode?: QueryMode | EnumQueryModeFieldRefInput<$PrismaModel>
    string_contains?: string | StringFieldRefInput<$PrismaModel>
    string_starts_with?: string | StringFieldRefInput<$PrismaModel>
    string_ends_with?: string | StringFieldRefInput<$PrismaModel>
    array_starts_with?: InputJsonValue | JsonFieldRefInput<$PrismaModel> | null
    array_ends_with?: InputJsonValue | JsonFieldRefInput<$PrismaModel> | null
    array_contains?: InputJsonValue | JsonFieldRefInput<$PrismaModel> | null
    lt?: InputJsonValue | JsonFieldRefInput<$PrismaModel>
    lte?: InputJsonValue | JsonFieldRefInput<$PrismaModel>
    gt?: InputJsonValue | JsonFieldRefInput<$PrismaModel>
    gte?: InputJsonValue | JsonFieldRefInput<$PrismaModel>
    not?: InputJsonValue | JsonFieldRefInput<$PrismaModel> | JsonNullValueFilter
  }

  export type SessionCreateWithoutUserInput = {
    id: string
    expiresAt: Date | string
    token: string
    createdAt?: Date | string
    updatedAt?: Date | string
    ipAddress?: string | null
    userAgent?: string | null
  }

  export type SessionUncheckedCreateWithoutUserInput = {
    id: string
    expiresAt: Date | string
    token: string
    createdAt?: Date | string
    updatedAt?: Date | string
    ipAddress?: string | null
    userAgent?: string | null
  }

  export type SessionCreateOrConnectWithoutUserInput = {
    where: SessionWhereUniqueInput
    create: XOR<SessionCreateWithoutUserInput, SessionUncheckedCreateWithoutUserInput>
  }

  export type SessionCreateManyUserInputEnvelope = {
    data: SessionCreateManyUserInput | SessionCreateManyUserInput[]
    skipDuplicates?: boolean
  }

  export type AccountCreateWithoutUserInput = {
    id: string
    accountId: string
    providerId: string
    accessToken?: string | null
    refreshToken?: string | null
    idToken?: string | null
    accessTokenExpiresAt?: Date | string | null
    refreshTokenExpiresAt?: Date | string | null
    scope?: string | null
    password?: string | null
    createdAt?: Date | string
    updatedAt?: Date | string
  }

  export type AccountUncheckedCreateWithoutUserInput = {
    id: string
    accountId: string
    providerId: string
    accessToken?: string | null
    refreshToken?: string | null
    idToken?: string | null
    accessTokenExpiresAt?: Date | string | null
    refreshTokenExpiresAt?: Date | string | null
    scope?: string | null
    password?: string | null
    createdAt?: Date | string
    updatedAt?: Date | string
  }

  export type AccountCreateOrConnectWithoutUserInput = {
    where: AccountWhereUniqueInput
    create: XOR<AccountCreateWithoutUserInput, AccountUncheckedCreateWithoutUserInput>
  }

  export type AccountCreateManyUserInputEnvelope = {
    data: AccountCreateManyUserInput | AccountCreateManyUserInput[]
    skipDuplicates?: boolean
  }

  export type DecisionCreateWithoutMadeByInput = {
    id?: string
    title: string
    decisionText: string
    rationale?: string | null
    confidenceScore?: number
    optionA?: string | null
    optionB?: string | null
    optionC?: string | null
    selectedOption: $Enums.SelectedOption
    outcome?: string | null
    createdAt?: Date | string
    updatedAt?: Date | string
    crisis: CrisisCreateNestedOneWithoutDecisionsInput
  }

  export type DecisionUncheckedCreateWithoutMadeByInput = {
    id?: string
    crisisId: string
    title: string
    decisionText: string
    rationale?: string | null
    confidenceScore?: number
    optionA?: string | null
    optionB?: string | null
    optionC?: string | null
    selectedOption: $Enums.SelectedOption
    outcome?: string | null
    createdAt?: Date | string
    updatedAt?: Date | string
  }

  export type DecisionCreateOrConnectWithoutMadeByInput = {
    where: DecisionWhereUniqueInput
    create: XOR<DecisionCreateWithoutMadeByInput, DecisionUncheckedCreateWithoutMadeByInput>
  }

  export type DecisionCreateManyMadeByInputEnvelope = {
    data: DecisionCreateManyMadeByInput | DecisionCreateManyMadeByInput[]
    skipDuplicates?: boolean
  }

  export type AuditDecisionCreateWithoutCreatedByInput = {
    id?: string
    title: string
    type: $Enums.AuditDecisionType
    decisionMade: string
    rationale: string
    riskLevel: $Enums.RiskLevel
    informationSources: JsonNullValueInput | InputJsonValue
    stakeholders: JsonNullValueInput | InputJsonValue
    alternatives?: string | null
    locationLat?: number | null
    locationLng?: number | null
    locationAddress?: string | null
    deviceId?: string
    status?: $Enums.AuditStatus
    syncStatus?: $Enums.SyncStatus
    tags?: JsonNullValueInput | InputJsonValue
    priority?: $Enums.Priority
    cryptoHash?: string | null
    createdAt?: Date | string
    updatedAt?: Date | string
    evidence?: EvidenceCreateNestedManyWithoutAuditDecisionInput
  }

  export type AuditDecisionUncheckedCreateWithoutCreatedByInput = {
    id?: string
    title: string
    type: $Enums.AuditDecisionType
    decisionMade: string
    rationale: string
    riskLevel: $Enums.RiskLevel
    informationSources: JsonNullValueInput | InputJsonValue
    stakeholders: JsonNullValueInput | InputJsonValue
    alternatives?: string | null
    locationLat?: number | null
    locationLng?: number | null
    locationAddress?: string | null
    deviceId?: string
    status?: $Enums.AuditStatus
    syncStatus?: $Enums.SyncStatus
    tags?: JsonNullValueInput | InputJsonValue
    priority?: $Enums.Priority
    cryptoHash?: string | null
    createdAt?: Date | string
    updatedAt?: Date | string
    evidence?: EvidenceUncheckedCreateNestedManyWithoutAuditDecisionInput
  }

  export type AuditDecisionCreateOrConnectWithoutCreatedByInput = {
    where: AuditDecisionWhereUniqueInput
    create: XOR<AuditDecisionCreateWithoutCreatedByInput, AuditDecisionUncheckedCreateWithoutCreatedByInput>
  }

  export type AuditDecisionCreateManyCreatedByInputEnvelope = {
    data: AuditDecisionCreateManyCreatedByInput | AuditDecisionCreateManyCreatedByInput[]
    skipDuplicates?: boolean
  }

  export type CrisisCreateWithoutCreatedByInput = {
    id?: string
    title: string
    type: $Enums.CrisisType
    severity: $Enums.CrisisSeverity
    location: string
    latitude?: number | null
    longitude?: number | null
    description?: string | null
    affectedPopulation?: number
    status?: $Enums.CrisisStatus
    createdAt?: Date | string
    updatedAt?: Date | string
    decisions?: DecisionCreateNestedManyWithoutCrisisInput
    alerts?: AlertCreateNestedManyWithoutCrisisInput
  }

  export type CrisisUncheckedCreateWithoutCreatedByInput = {
    id?: string
    title: string
    type: $Enums.CrisisType
    severity: $Enums.CrisisSeverity
    location: string
    latitude?: number | null
    longitude?: number | null
    description?: string | null
    affectedPopulation?: number
    status?: $Enums.CrisisStatus
    createdAt?: Date | string
    updatedAt?: Date | string
    decisions?: DecisionUncheckedCreateNestedManyWithoutCrisisInput
    alerts?: AlertUncheckedCreateNestedManyWithoutCrisisInput
  }

  export type CrisisCreateOrConnectWithoutCreatedByInput = {
    where: CrisisWhereUniqueInput
    create: XOR<CrisisCreateWithoutCreatedByInput, CrisisUncheckedCreateWithoutCreatedByInput>
  }

  export type CrisisCreateManyCreatedByInputEnvelope = {
    data: CrisisCreateManyCreatedByInput | CrisisCreateManyCreatedByInput[]
    skipDuplicates?: boolean
  }

  export type SessionUpsertWithWhereUniqueWithoutUserInput = {
    where: SessionWhereUniqueInput
    update: XOR<SessionUpdateWithoutUserInput, SessionUncheckedUpdateWithoutUserInput>
    create: XOR<SessionCreateWithoutUserInput, SessionUncheckedCreateWithoutUserInput>
  }

  export type SessionUpdateWithWhereUniqueWithoutUserInput = {
    where: SessionWhereUniqueInput
    data: XOR<SessionUpdateWithoutUserInput, SessionUncheckedUpdateWithoutUserInput>
  }

  export type SessionUpdateManyWithWhereWithoutUserInput = {
    where: SessionScalarWhereInput
    data: XOR<SessionUpdateManyMutationInput, SessionUncheckedUpdateManyWithoutUserInput>
  }

  export type SessionScalarWhereInput = {
    AND?: SessionScalarWhereInput | SessionScalarWhereInput[]
    OR?: SessionScalarWhereInput[]
    NOT?: SessionScalarWhereInput | SessionScalarWhereInput[]
    id?: StringFilter<"Session"> | string
    expiresAt?: DateTimeFilter<"Session"> | Date | string
    token?: StringFilter<"Session"> | string
    createdAt?: DateTimeFilter<"Session"> | Date | string
    updatedAt?: DateTimeFilter<"Session"> | Date | string
    ipAddress?: StringNullableFilter<"Session"> | string | null
    userAgent?: StringNullableFilter<"Session"> | string | null
    userId?: StringFilter<"Session"> | string
  }

  export type AccountUpsertWithWhereUniqueWithoutUserInput = {
    where: AccountWhereUniqueInput
    update: XOR<AccountUpdateWithoutUserInput, AccountUncheckedUpdateWithoutUserInput>
    create: XOR<AccountCreateWithoutUserInput, AccountUncheckedCreateWithoutUserInput>
  }

  export type AccountUpdateWithWhereUniqueWithoutUserInput = {
    where: AccountWhereUniqueInput
    data: XOR<AccountUpdateWithoutUserInput, AccountUncheckedUpdateWithoutUserInput>
  }

  export type AccountUpdateManyWithWhereWithoutUserInput = {
    where: AccountScalarWhereInput
    data: XOR<AccountUpdateManyMutationInput, AccountUncheckedUpdateManyWithoutUserInput>
  }

  export type AccountScalarWhereInput = {
    AND?: AccountScalarWhereInput | AccountScalarWhereInput[]
    OR?: AccountScalarWhereInput[]
    NOT?: AccountScalarWhereInput | AccountScalarWhereInput[]
    id?: StringFilter<"Account"> | string
    accountId?: StringFilter<"Account"> | string
    providerId?: StringFilter<"Account"> | string
    userId?: StringFilter<"Account"> | string
    accessToken?: StringNullableFilter<"Account"> | string | null
    refreshToken?: StringNullableFilter<"Account"> | string | null
    idToken?: StringNullableFilter<"Account"> | string | null
    accessTokenExpiresAt?: DateTimeNullableFilter<"Account"> | Date | string | null
    refreshTokenExpiresAt?: DateTimeNullableFilter<"Account"> | Date | string | null
    scope?: StringNullableFilter<"Account"> | string | null
    password?: StringNullableFilter<"Account"> | string | null
    createdAt?: DateTimeFilter<"Account"> | Date | string
    updatedAt?: DateTimeFilter<"Account"> | Date | string
  }

  export type DecisionUpsertWithWhereUniqueWithoutMadeByInput = {
    where: DecisionWhereUniqueInput
    update: XOR<DecisionUpdateWithoutMadeByInput, DecisionUncheckedUpdateWithoutMadeByInput>
    create: XOR<DecisionCreateWithoutMadeByInput, DecisionUncheckedCreateWithoutMadeByInput>
  }

  export type DecisionUpdateWithWhereUniqueWithoutMadeByInput = {
    where: DecisionWhereUniqueInput
    data: XOR<DecisionUpdateWithoutMadeByInput, DecisionUncheckedUpdateWithoutMadeByInput>
  }

  export type DecisionUpdateManyWithWhereWithoutMadeByInput = {
    where: DecisionScalarWhereInput
    data: XOR<DecisionUpdateManyMutationInput, DecisionUncheckedUpdateManyWithoutMadeByInput>
  }

  export type DecisionScalarWhereInput = {
    AND?: DecisionScalarWhereInput | DecisionScalarWhereInput[]
    OR?: DecisionScalarWhereInput[]
    NOT?: DecisionScalarWhereInput | DecisionScalarWhereInput[]
    id?: StringFilter<"Decision"> | string
    crisisId?: StringFilter<"Decision"> | string
    title?: StringFilter<"Decision"> | string
    decisionText?: StringFilter<"Decision"> | string
    rationale?: StringNullableFilter<"Decision"> | string | null
    confidenceScore?: IntFilter<"Decision"> | number
    optionA?: StringNullableFilter<"Decision"> | string | null
    optionB?: StringNullableFilter<"Decision"> | string | null
    optionC?: StringNullableFilter<"Decision"> | string | null
    selectedOption?: EnumSelectedOptionFilter<"Decision"> | $Enums.SelectedOption
    outcome?: StringNullableFilter<"Decision"> | string | null
    madeById?: StringFilter<"Decision"> | string
    createdAt?: DateTimeFilter<"Decision"> | Date | string
    updatedAt?: DateTimeFilter<"Decision"> | Date | string
  }

  export type AuditDecisionUpsertWithWhereUniqueWithoutCreatedByInput = {
    where: AuditDecisionWhereUniqueInput
    update: XOR<AuditDecisionUpdateWithoutCreatedByInput, AuditDecisionUncheckedUpdateWithoutCreatedByInput>
    create: XOR<AuditDecisionCreateWithoutCreatedByInput, AuditDecisionUncheckedCreateWithoutCreatedByInput>
  }

  export type AuditDecisionUpdateWithWhereUniqueWithoutCreatedByInput = {
    where: AuditDecisionWhereUniqueInput
    data: XOR<AuditDecisionUpdateWithoutCreatedByInput, AuditDecisionUncheckedUpdateWithoutCreatedByInput>
  }

  export type AuditDecisionUpdateManyWithWhereWithoutCreatedByInput = {
    where: AuditDecisionScalarWhereInput
    data: XOR<AuditDecisionUpdateManyMutationInput, AuditDecisionUncheckedUpdateManyWithoutCreatedByInput>
  }

  export type AuditDecisionScalarWhereInput = {
    AND?: AuditDecisionScalarWhereInput | AuditDecisionScalarWhereInput[]
    OR?: AuditDecisionScalarWhereInput[]
    NOT?: AuditDecisionScalarWhereInput | AuditDecisionScalarWhereInput[]
    id?: StringFilter<"AuditDecision"> | string
    title?: StringFilter<"AuditDecision"> | string
    type?: EnumAuditDecisionTypeFilter<"AuditDecision"> | $Enums.AuditDecisionType
    decisionMade?: StringFilter<"AuditDecision"> | string
    rationale?: StringFilter<"AuditDecision"> | string
    riskLevel?: EnumRiskLevelFilter<"AuditDecision"> | $Enums.RiskLevel
    informationSources?: JsonFilter<"AuditDecision">
    stakeholders?: JsonFilter<"AuditDecision">
    alternatives?: StringNullableFilter<"AuditDecision"> | string | null
    locationLat?: FloatNullableFilter<"AuditDecision"> | number | null
    locationLng?: FloatNullableFilter<"AuditDecision"> | number | null
    locationAddress?: StringNullableFilter<"AuditDecision"> | string | null
    deviceId?: StringFilter<"AuditDecision"> | string
    status?: EnumAuditStatusFilter<"AuditDecision"> | $Enums.AuditStatus
    syncStatus?: EnumSyncStatusFilter<"AuditDecision"> | $Enums.SyncStatus
    tags?: JsonFilter<"AuditDecision">
    priority?: EnumPriorityFilter<"AuditDecision"> | $Enums.Priority
    cryptoHash?: StringNullableFilter<"AuditDecision"> | string | null
    createdById?: StringFilter<"AuditDecision"> | string
    createdAt?: DateTimeFilter<"AuditDecision"> | Date | string
    updatedAt?: DateTimeFilter<"AuditDecision"> | Date | string
  }

  export type CrisisUpsertWithWhereUniqueWithoutCreatedByInput = {
    where: CrisisWhereUniqueInput
    update: XOR<CrisisUpdateWithoutCreatedByInput, CrisisUncheckedUpdateWithoutCreatedByInput>
    create: XOR<CrisisCreateWithoutCreatedByInput, CrisisUncheckedCreateWithoutCreatedByInput>
  }

  export type CrisisUpdateWithWhereUniqueWithoutCreatedByInput = {
    where: CrisisWhereUniqueInput
    data: XOR<CrisisUpdateWithoutCreatedByInput, CrisisUncheckedUpdateWithoutCreatedByInput>
  }

  export type CrisisUpdateManyWithWhereWithoutCreatedByInput = {
    where: CrisisScalarWhereInput
    data: XOR<CrisisUpdateManyMutationInput, CrisisUncheckedUpdateManyWithoutCreatedByInput>
  }

  export type CrisisScalarWhereInput = {
    AND?: CrisisScalarWhereInput | CrisisScalarWhereInput[]
    OR?: CrisisScalarWhereInput[]
    NOT?: CrisisScalarWhereInput | CrisisScalarWhereInput[]
    id?: StringFilter<"Crisis"> | string
    title?: StringFilter<"Crisis"> | string
    type?: EnumCrisisTypeFilter<"Crisis"> | $Enums.CrisisType
    severity?: EnumCrisisSeverityFilter<"Crisis"> | $Enums.CrisisSeverity
    location?: StringFilter<"Crisis"> | string
    latitude?: FloatNullableFilter<"Crisis"> | number | null
    longitude?: FloatNullableFilter<"Crisis"> | number | null
    description?: StringNullableFilter<"Crisis"> | string | null
    affectedPopulation?: IntFilter<"Crisis"> | number
    status?: EnumCrisisStatusFilter<"Crisis"> | $Enums.CrisisStatus
    createdById?: StringFilter<"Crisis"> | string
    createdAt?: DateTimeFilter<"Crisis"> | Date | string
    updatedAt?: DateTimeFilter<"Crisis"> | Date | string
  }

  export type UserCreateWithoutSessionsInput = {
    id: string
    name: string
    email: string
    emailVerified?: boolean
    image?: string | null
    createdAt?: Date | string
    updatedAt?: Date | string
    role?: $Enums.UserRole
    organization?: string | null
    country?: string | null
    accounts?: AccountCreateNestedManyWithoutUserInput
    decisions?: DecisionCreateNestedManyWithoutMadeByInput
    auditDecisions?: AuditDecisionCreateNestedManyWithoutCreatedByInput
    crises?: CrisisCreateNestedManyWithoutCreatedByInput
  }

  export type UserUncheckedCreateWithoutSessionsInput = {
    id: string
    name: string
    email: string
    emailVerified?: boolean
    image?: string | null
    createdAt?: Date | string
    updatedAt?: Date | string
    role?: $Enums.UserRole
    organization?: string | null
    country?: string | null
    accounts?: AccountUncheckedCreateNestedManyWithoutUserInput
    decisions?: DecisionUncheckedCreateNestedManyWithoutMadeByInput
    auditDecisions?: AuditDecisionUncheckedCreateNestedManyWithoutCreatedByInput
    crises?: CrisisUncheckedCreateNestedManyWithoutCreatedByInput
  }

  export type UserCreateOrConnectWithoutSessionsInput = {
    where: UserWhereUniqueInput
    create: XOR<UserCreateWithoutSessionsInput, UserUncheckedCreateWithoutSessionsInput>
  }

  export type UserUpsertWithoutSessionsInput = {
    update: XOR<UserUpdateWithoutSessionsInput, UserUncheckedUpdateWithoutSessionsInput>
    create: XOR<UserCreateWithoutSessionsInput, UserUncheckedCreateWithoutSessionsInput>
    where?: UserWhereInput
  }

  export type UserUpdateToOneWithWhereWithoutSessionsInput = {
    where?: UserWhereInput
    data: XOR<UserUpdateWithoutSessionsInput, UserUncheckedUpdateWithoutSessionsInput>
  }

  export type UserUpdateWithoutSessionsInput = {
    id?: StringFieldUpdateOperationsInput | string
    name?: StringFieldUpdateOperationsInput | string
    email?: StringFieldUpdateOperationsInput | string
    emailVerified?: BoolFieldUpdateOperationsInput | boolean
    image?: NullableStringFieldUpdateOperationsInput | string | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    role?: EnumUserRoleFieldUpdateOperationsInput | $Enums.UserRole
    organization?: NullableStringFieldUpdateOperationsInput | string | null
    country?: NullableStringFieldUpdateOperationsInput | string | null
    accounts?: AccountUpdateManyWithoutUserNestedInput
    decisions?: DecisionUpdateManyWithoutMadeByNestedInput
    auditDecisions?: AuditDecisionUpdateManyWithoutCreatedByNestedInput
    crises?: CrisisUpdateManyWithoutCreatedByNestedInput
  }

  export type UserUncheckedUpdateWithoutSessionsInput = {
    id?: StringFieldUpdateOperationsInput | string
    name?: StringFieldUpdateOperationsInput | string
    email?: StringFieldUpdateOperationsInput | string
    emailVerified?: BoolFieldUpdateOperationsInput | boolean
    image?: NullableStringFieldUpdateOperationsInput | string | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    role?: EnumUserRoleFieldUpdateOperationsInput | $Enums.UserRole
    organization?: NullableStringFieldUpdateOperationsInput | string | null
    country?: NullableStringFieldUpdateOperationsInput | string | null
    accounts?: AccountUncheckedUpdateManyWithoutUserNestedInput
    decisions?: DecisionUncheckedUpdateManyWithoutMadeByNestedInput
    auditDecisions?: AuditDecisionUncheckedUpdateManyWithoutCreatedByNestedInput
    crises?: CrisisUncheckedUpdateManyWithoutCreatedByNestedInput
  }

  export type UserCreateWithoutAccountsInput = {
    id: string
    name: string
    email: string
    emailVerified?: boolean
    image?: string | null
    createdAt?: Date | string
    updatedAt?: Date | string
    role?: $Enums.UserRole
    organization?: string | null
    country?: string | null
    sessions?: SessionCreateNestedManyWithoutUserInput
    decisions?: DecisionCreateNestedManyWithoutMadeByInput
    auditDecisions?: AuditDecisionCreateNestedManyWithoutCreatedByInput
    crises?: CrisisCreateNestedManyWithoutCreatedByInput
  }

  export type UserUncheckedCreateWithoutAccountsInput = {
    id: string
    name: string
    email: string
    emailVerified?: boolean
    image?: string | null
    createdAt?: Date | string
    updatedAt?: Date | string
    role?: $Enums.UserRole
    organization?: string | null
    country?: string | null
    sessions?: SessionUncheckedCreateNestedManyWithoutUserInput
    decisions?: DecisionUncheckedCreateNestedManyWithoutMadeByInput
    auditDecisions?: AuditDecisionUncheckedCreateNestedManyWithoutCreatedByInput
    crises?: CrisisUncheckedCreateNestedManyWithoutCreatedByInput
  }

  export type UserCreateOrConnectWithoutAccountsInput = {
    where: UserWhereUniqueInput
    create: XOR<UserCreateWithoutAccountsInput, UserUncheckedCreateWithoutAccountsInput>
  }

  export type UserUpsertWithoutAccountsInput = {
    update: XOR<UserUpdateWithoutAccountsInput, UserUncheckedUpdateWithoutAccountsInput>
    create: XOR<UserCreateWithoutAccountsInput, UserUncheckedCreateWithoutAccountsInput>
    where?: UserWhereInput
  }

  export type UserUpdateToOneWithWhereWithoutAccountsInput = {
    where?: UserWhereInput
    data: XOR<UserUpdateWithoutAccountsInput, UserUncheckedUpdateWithoutAccountsInput>
  }

  export type UserUpdateWithoutAccountsInput = {
    id?: StringFieldUpdateOperationsInput | string
    name?: StringFieldUpdateOperationsInput | string
    email?: StringFieldUpdateOperationsInput | string
    emailVerified?: BoolFieldUpdateOperationsInput | boolean
    image?: NullableStringFieldUpdateOperationsInput | string | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    role?: EnumUserRoleFieldUpdateOperationsInput | $Enums.UserRole
    organization?: NullableStringFieldUpdateOperationsInput | string | null
    country?: NullableStringFieldUpdateOperationsInput | string | null
    sessions?: SessionUpdateManyWithoutUserNestedInput
    decisions?: DecisionUpdateManyWithoutMadeByNestedInput
    auditDecisions?: AuditDecisionUpdateManyWithoutCreatedByNestedInput
    crises?: CrisisUpdateManyWithoutCreatedByNestedInput
  }

  export type UserUncheckedUpdateWithoutAccountsInput = {
    id?: StringFieldUpdateOperationsInput | string
    name?: StringFieldUpdateOperationsInput | string
    email?: StringFieldUpdateOperationsInput | string
    emailVerified?: BoolFieldUpdateOperationsInput | boolean
    image?: NullableStringFieldUpdateOperationsInput | string | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    role?: EnumUserRoleFieldUpdateOperationsInput | $Enums.UserRole
    organization?: NullableStringFieldUpdateOperationsInput | string | null
    country?: NullableStringFieldUpdateOperationsInput | string | null
    sessions?: SessionUncheckedUpdateManyWithoutUserNestedInput
    decisions?: DecisionUncheckedUpdateManyWithoutMadeByNestedInput
    auditDecisions?: AuditDecisionUncheckedUpdateManyWithoutCreatedByNestedInput
    crises?: CrisisUncheckedUpdateManyWithoutCreatedByNestedInput
  }

  export type UserCreateWithoutCrisesInput = {
    id: string
    name: string
    email: string
    emailVerified?: boolean
    image?: string | null
    createdAt?: Date | string
    updatedAt?: Date | string
    role?: $Enums.UserRole
    organization?: string | null
    country?: string | null
    sessions?: SessionCreateNestedManyWithoutUserInput
    accounts?: AccountCreateNestedManyWithoutUserInput
    decisions?: DecisionCreateNestedManyWithoutMadeByInput
    auditDecisions?: AuditDecisionCreateNestedManyWithoutCreatedByInput
  }

  export type UserUncheckedCreateWithoutCrisesInput = {
    id: string
    name: string
    email: string
    emailVerified?: boolean
    image?: string | null
    createdAt?: Date | string
    updatedAt?: Date | string
    role?: $Enums.UserRole
    organization?: string | null
    country?: string | null
    sessions?: SessionUncheckedCreateNestedManyWithoutUserInput
    accounts?: AccountUncheckedCreateNestedManyWithoutUserInput
    decisions?: DecisionUncheckedCreateNestedManyWithoutMadeByInput
    auditDecisions?: AuditDecisionUncheckedCreateNestedManyWithoutCreatedByInput
  }

  export type UserCreateOrConnectWithoutCrisesInput = {
    where: UserWhereUniqueInput
    create: XOR<UserCreateWithoutCrisesInput, UserUncheckedCreateWithoutCrisesInput>
  }

  export type DecisionCreateWithoutCrisisInput = {
    id?: string
    title: string
    decisionText: string
    rationale?: string | null
    confidenceScore?: number
    optionA?: string | null
    optionB?: string | null
    optionC?: string | null
    selectedOption: $Enums.SelectedOption
    outcome?: string | null
    createdAt?: Date | string
    updatedAt?: Date | string
    madeBy: UserCreateNestedOneWithoutDecisionsInput
  }

  export type DecisionUncheckedCreateWithoutCrisisInput = {
    id?: string
    title: string
    decisionText: string
    rationale?: string | null
    confidenceScore?: number
    optionA?: string | null
    optionB?: string | null
    optionC?: string | null
    selectedOption: $Enums.SelectedOption
    outcome?: string | null
    madeById: string
    createdAt?: Date | string
    updatedAt?: Date | string
  }

  export type DecisionCreateOrConnectWithoutCrisisInput = {
    where: DecisionWhereUniqueInput
    create: XOR<DecisionCreateWithoutCrisisInput, DecisionUncheckedCreateWithoutCrisisInput>
  }

  export type DecisionCreateManyCrisisInputEnvelope = {
    data: DecisionCreateManyCrisisInput | DecisionCreateManyCrisisInput[]
    skipDuplicates?: boolean
  }

  export type AlertCreateWithoutCrisisInput = {
    id?: string
    type: $Enums.AlertType
    severity: $Enums.AlertSeverity
    message: string
    isActive?: boolean
    triggeredAt?: Date | string
    resolvedAt?: Date | string | null
  }

  export type AlertUncheckedCreateWithoutCrisisInput = {
    id?: string
    type: $Enums.AlertType
    severity: $Enums.AlertSeverity
    message: string
    isActive?: boolean
    triggeredAt?: Date | string
    resolvedAt?: Date | string | null
  }

  export type AlertCreateOrConnectWithoutCrisisInput = {
    where: AlertWhereUniqueInput
    create: XOR<AlertCreateWithoutCrisisInput, AlertUncheckedCreateWithoutCrisisInput>
  }

  export type AlertCreateManyCrisisInputEnvelope = {
    data: AlertCreateManyCrisisInput | AlertCreateManyCrisisInput[]
    skipDuplicates?: boolean
  }

  export type UserUpsertWithoutCrisesInput = {
    update: XOR<UserUpdateWithoutCrisesInput, UserUncheckedUpdateWithoutCrisesInput>
    create: XOR<UserCreateWithoutCrisesInput, UserUncheckedCreateWithoutCrisesInput>
    where?: UserWhereInput
  }

  export type UserUpdateToOneWithWhereWithoutCrisesInput = {
    where?: UserWhereInput
    data: XOR<UserUpdateWithoutCrisesInput, UserUncheckedUpdateWithoutCrisesInput>
  }

  export type UserUpdateWithoutCrisesInput = {
    id?: StringFieldUpdateOperationsInput | string
    name?: StringFieldUpdateOperationsInput | string
    email?: StringFieldUpdateOperationsInput | string
    emailVerified?: BoolFieldUpdateOperationsInput | boolean
    image?: NullableStringFieldUpdateOperationsInput | string | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    role?: EnumUserRoleFieldUpdateOperationsInput | $Enums.UserRole
    organization?: NullableStringFieldUpdateOperationsInput | string | null
    country?: NullableStringFieldUpdateOperationsInput | string | null
    sessions?: SessionUpdateManyWithoutUserNestedInput
    accounts?: AccountUpdateManyWithoutUserNestedInput
    decisions?: DecisionUpdateManyWithoutMadeByNestedInput
    auditDecisions?: AuditDecisionUpdateManyWithoutCreatedByNestedInput
  }

  export type UserUncheckedUpdateWithoutCrisesInput = {
    id?: StringFieldUpdateOperationsInput | string
    name?: StringFieldUpdateOperationsInput | string
    email?: StringFieldUpdateOperationsInput | string
    emailVerified?: BoolFieldUpdateOperationsInput | boolean
    image?: NullableStringFieldUpdateOperationsInput | string | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    role?: EnumUserRoleFieldUpdateOperationsInput | $Enums.UserRole
    organization?: NullableStringFieldUpdateOperationsInput | string | null
    country?: NullableStringFieldUpdateOperationsInput | string | null
    sessions?: SessionUncheckedUpdateManyWithoutUserNestedInput
    accounts?: AccountUncheckedUpdateManyWithoutUserNestedInput
    decisions?: DecisionUncheckedUpdateManyWithoutMadeByNestedInput
    auditDecisions?: AuditDecisionUncheckedUpdateManyWithoutCreatedByNestedInput
  }

  export type DecisionUpsertWithWhereUniqueWithoutCrisisInput = {
    where: DecisionWhereUniqueInput
    update: XOR<DecisionUpdateWithoutCrisisInput, DecisionUncheckedUpdateWithoutCrisisInput>
    create: XOR<DecisionCreateWithoutCrisisInput, DecisionUncheckedCreateWithoutCrisisInput>
  }

  export type DecisionUpdateWithWhereUniqueWithoutCrisisInput = {
    where: DecisionWhereUniqueInput
    data: XOR<DecisionUpdateWithoutCrisisInput, DecisionUncheckedUpdateWithoutCrisisInput>
  }

  export type DecisionUpdateManyWithWhereWithoutCrisisInput = {
    where: DecisionScalarWhereInput
    data: XOR<DecisionUpdateManyMutationInput, DecisionUncheckedUpdateManyWithoutCrisisInput>
  }

  export type AlertUpsertWithWhereUniqueWithoutCrisisInput = {
    where: AlertWhereUniqueInput
    update: XOR<AlertUpdateWithoutCrisisInput, AlertUncheckedUpdateWithoutCrisisInput>
    create: XOR<AlertCreateWithoutCrisisInput, AlertUncheckedCreateWithoutCrisisInput>
  }

  export type AlertUpdateWithWhereUniqueWithoutCrisisInput = {
    where: AlertWhereUniqueInput
    data: XOR<AlertUpdateWithoutCrisisInput, AlertUncheckedUpdateWithoutCrisisInput>
  }

  export type AlertUpdateManyWithWhereWithoutCrisisInput = {
    where: AlertScalarWhereInput
    data: XOR<AlertUpdateManyMutationInput, AlertUncheckedUpdateManyWithoutCrisisInput>
  }

  export type AlertScalarWhereInput = {
    AND?: AlertScalarWhereInput | AlertScalarWhereInput[]
    OR?: AlertScalarWhereInput[]
    NOT?: AlertScalarWhereInput | AlertScalarWhereInput[]
    id?: StringFilter<"Alert"> | string
    crisisId?: StringFilter<"Alert"> | string
    type?: EnumAlertTypeFilter<"Alert"> | $Enums.AlertType
    severity?: EnumAlertSeverityFilter<"Alert"> | $Enums.AlertSeverity
    message?: StringFilter<"Alert"> | string
    isActive?: BoolFilter<"Alert"> | boolean
    triggeredAt?: DateTimeFilter<"Alert"> | Date | string
    resolvedAt?: DateTimeNullableFilter<"Alert"> | Date | string | null
  }

  export type CrisisCreateWithoutDecisionsInput = {
    id?: string
    title: string
    type: $Enums.CrisisType
    severity: $Enums.CrisisSeverity
    location: string
    latitude?: number | null
    longitude?: number | null
    description?: string | null
    affectedPopulation?: number
    status?: $Enums.CrisisStatus
    createdAt?: Date | string
    updatedAt?: Date | string
    createdBy: UserCreateNestedOneWithoutCrisesInput
    alerts?: AlertCreateNestedManyWithoutCrisisInput
  }

  export type CrisisUncheckedCreateWithoutDecisionsInput = {
    id?: string
    title: string
    type: $Enums.CrisisType
    severity: $Enums.CrisisSeverity
    location: string
    latitude?: number | null
    longitude?: number | null
    description?: string | null
    affectedPopulation?: number
    status?: $Enums.CrisisStatus
    createdById: string
    createdAt?: Date | string
    updatedAt?: Date | string
    alerts?: AlertUncheckedCreateNestedManyWithoutCrisisInput
  }

  export type CrisisCreateOrConnectWithoutDecisionsInput = {
    where: CrisisWhereUniqueInput
    create: XOR<CrisisCreateWithoutDecisionsInput, CrisisUncheckedCreateWithoutDecisionsInput>
  }

  export type UserCreateWithoutDecisionsInput = {
    id: string
    name: string
    email: string
    emailVerified?: boolean
    image?: string | null
    createdAt?: Date | string
    updatedAt?: Date | string
    role?: $Enums.UserRole
    organization?: string | null
    country?: string | null
    sessions?: SessionCreateNestedManyWithoutUserInput
    accounts?: AccountCreateNestedManyWithoutUserInput
    auditDecisions?: AuditDecisionCreateNestedManyWithoutCreatedByInput
    crises?: CrisisCreateNestedManyWithoutCreatedByInput
  }

  export type UserUncheckedCreateWithoutDecisionsInput = {
    id: string
    name: string
    email: string
    emailVerified?: boolean
    image?: string | null
    createdAt?: Date | string
    updatedAt?: Date | string
    role?: $Enums.UserRole
    organization?: string | null
    country?: string | null
    sessions?: SessionUncheckedCreateNestedManyWithoutUserInput
    accounts?: AccountUncheckedCreateNestedManyWithoutUserInput
    auditDecisions?: AuditDecisionUncheckedCreateNestedManyWithoutCreatedByInput
    crises?: CrisisUncheckedCreateNestedManyWithoutCreatedByInput
  }

  export type UserCreateOrConnectWithoutDecisionsInput = {
    where: UserWhereUniqueInput
    create: XOR<UserCreateWithoutDecisionsInput, UserUncheckedCreateWithoutDecisionsInput>
  }

  export type CrisisUpsertWithoutDecisionsInput = {
    update: XOR<CrisisUpdateWithoutDecisionsInput, CrisisUncheckedUpdateWithoutDecisionsInput>
    create: XOR<CrisisCreateWithoutDecisionsInput, CrisisUncheckedCreateWithoutDecisionsInput>
    where?: CrisisWhereInput
  }

  export type CrisisUpdateToOneWithWhereWithoutDecisionsInput = {
    where?: CrisisWhereInput
    data: XOR<CrisisUpdateWithoutDecisionsInput, CrisisUncheckedUpdateWithoutDecisionsInput>
  }

  export type CrisisUpdateWithoutDecisionsInput = {
    id?: StringFieldUpdateOperationsInput | string
    title?: StringFieldUpdateOperationsInput | string
    type?: EnumCrisisTypeFieldUpdateOperationsInput | $Enums.CrisisType
    severity?: EnumCrisisSeverityFieldUpdateOperationsInput | $Enums.CrisisSeverity
    location?: StringFieldUpdateOperationsInput | string
    latitude?: NullableFloatFieldUpdateOperationsInput | number | null
    longitude?: NullableFloatFieldUpdateOperationsInput | number | null
    description?: NullableStringFieldUpdateOperationsInput | string | null
    affectedPopulation?: IntFieldUpdateOperationsInput | number
    status?: EnumCrisisStatusFieldUpdateOperationsInput | $Enums.CrisisStatus
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    createdBy?: UserUpdateOneRequiredWithoutCrisesNestedInput
    alerts?: AlertUpdateManyWithoutCrisisNestedInput
  }

  export type CrisisUncheckedUpdateWithoutDecisionsInput = {
    id?: StringFieldUpdateOperationsInput | string
    title?: StringFieldUpdateOperationsInput | string
    type?: EnumCrisisTypeFieldUpdateOperationsInput | $Enums.CrisisType
    severity?: EnumCrisisSeverityFieldUpdateOperationsInput | $Enums.CrisisSeverity
    location?: StringFieldUpdateOperationsInput | string
    latitude?: NullableFloatFieldUpdateOperationsInput | number | null
    longitude?: NullableFloatFieldUpdateOperationsInput | number | null
    description?: NullableStringFieldUpdateOperationsInput | string | null
    affectedPopulation?: IntFieldUpdateOperationsInput | number
    status?: EnumCrisisStatusFieldUpdateOperationsInput | $Enums.CrisisStatus
    createdById?: StringFieldUpdateOperationsInput | string
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    alerts?: AlertUncheckedUpdateManyWithoutCrisisNestedInput
  }

  export type UserUpsertWithoutDecisionsInput = {
    update: XOR<UserUpdateWithoutDecisionsInput, UserUncheckedUpdateWithoutDecisionsInput>
    create: XOR<UserCreateWithoutDecisionsInput, UserUncheckedCreateWithoutDecisionsInput>
    where?: UserWhereInput
  }

  export type UserUpdateToOneWithWhereWithoutDecisionsInput = {
    where?: UserWhereInput
    data: XOR<UserUpdateWithoutDecisionsInput, UserUncheckedUpdateWithoutDecisionsInput>
  }

  export type UserUpdateWithoutDecisionsInput = {
    id?: StringFieldUpdateOperationsInput | string
    name?: StringFieldUpdateOperationsInput | string
    email?: StringFieldUpdateOperationsInput | string
    emailVerified?: BoolFieldUpdateOperationsInput | boolean
    image?: NullableStringFieldUpdateOperationsInput | string | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    role?: EnumUserRoleFieldUpdateOperationsInput | $Enums.UserRole
    organization?: NullableStringFieldUpdateOperationsInput | string | null
    country?: NullableStringFieldUpdateOperationsInput | string | null
    sessions?: SessionUpdateManyWithoutUserNestedInput
    accounts?: AccountUpdateManyWithoutUserNestedInput
    auditDecisions?: AuditDecisionUpdateManyWithoutCreatedByNestedInput
    crises?: CrisisUpdateManyWithoutCreatedByNestedInput
  }

  export type UserUncheckedUpdateWithoutDecisionsInput = {
    id?: StringFieldUpdateOperationsInput | string
    name?: StringFieldUpdateOperationsInput | string
    email?: StringFieldUpdateOperationsInput | string
    emailVerified?: BoolFieldUpdateOperationsInput | boolean
    image?: NullableStringFieldUpdateOperationsInput | string | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    role?: EnumUserRoleFieldUpdateOperationsInput | $Enums.UserRole
    organization?: NullableStringFieldUpdateOperationsInput | string | null
    country?: NullableStringFieldUpdateOperationsInput | string | null
    sessions?: SessionUncheckedUpdateManyWithoutUserNestedInput
    accounts?: AccountUncheckedUpdateManyWithoutUserNestedInput
    auditDecisions?: AuditDecisionUncheckedUpdateManyWithoutCreatedByNestedInput
    crises?: CrisisUncheckedUpdateManyWithoutCreatedByNestedInput
  }

  export type CrisisCreateWithoutAlertsInput = {
    id?: string
    title: string
    type: $Enums.CrisisType
    severity: $Enums.CrisisSeverity
    location: string
    latitude?: number | null
    longitude?: number | null
    description?: string | null
    affectedPopulation?: number
    status?: $Enums.CrisisStatus
    createdAt?: Date | string
    updatedAt?: Date | string
    createdBy: UserCreateNestedOneWithoutCrisesInput
    decisions?: DecisionCreateNestedManyWithoutCrisisInput
  }

  export type CrisisUncheckedCreateWithoutAlertsInput = {
    id?: string
    title: string
    type: $Enums.CrisisType
    severity: $Enums.CrisisSeverity
    location: string
    latitude?: number | null
    longitude?: number | null
    description?: string | null
    affectedPopulation?: number
    status?: $Enums.CrisisStatus
    createdById: string
    createdAt?: Date | string
    updatedAt?: Date | string
    decisions?: DecisionUncheckedCreateNestedManyWithoutCrisisInput
  }

  export type CrisisCreateOrConnectWithoutAlertsInput = {
    where: CrisisWhereUniqueInput
    create: XOR<CrisisCreateWithoutAlertsInput, CrisisUncheckedCreateWithoutAlertsInput>
  }

  export type CrisisUpsertWithoutAlertsInput = {
    update: XOR<CrisisUpdateWithoutAlertsInput, CrisisUncheckedUpdateWithoutAlertsInput>
    create: XOR<CrisisCreateWithoutAlertsInput, CrisisUncheckedCreateWithoutAlertsInput>
    where?: CrisisWhereInput
  }

  export type CrisisUpdateToOneWithWhereWithoutAlertsInput = {
    where?: CrisisWhereInput
    data: XOR<CrisisUpdateWithoutAlertsInput, CrisisUncheckedUpdateWithoutAlertsInput>
  }

  export type CrisisUpdateWithoutAlertsInput = {
    id?: StringFieldUpdateOperationsInput | string
    title?: StringFieldUpdateOperationsInput | string
    type?: EnumCrisisTypeFieldUpdateOperationsInput | $Enums.CrisisType
    severity?: EnumCrisisSeverityFieldUpdateOperationsInput | $Enums.CrisisSeverity
    location?: StringFieldUpdateOperationsInput | string
    latitude?: NullableFloatFieldUpdateOperationsInput | number | null
    longitude?: NullableFloatFieldUpdateOperationsInput | number | null
    description?: NullableStringFieldUpdateOperationsInput | string | null
    affectedPopulation?: IntFieldUpdateOperationsInput | number
    status?: EnumCrisisStatusFieldUpdateOperationsInput | $Enums.CrisisStatus
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    createdBy?: UserUpdateOneRequiredWithoutCrisesNestedInput
    decisions?: DecisionUpdateManyWithoutCrisisNestedInput
  }

  export type CrisisUncheckedUpdateWithoutAlertsInput = {
    id?: StringFieldUpdateOperationsInput | string
    title?: StringFieldUpdateOperationsInput | string
    type?: EnumCrisisTypeFieldUpdateOperationsInput | $Enums.CrisisType
    severity?: EnumCrisisSeverityFieldUpdateOperationsInput | $Enums.CrisisSeverity
    location?: StringFieldUpdateOperationsInput | string
    latitude?: NullableFloatFieldUpdateOperationsInput | number | null
    longitude?: NullableFloatFieldUpdateOperationsInput | number | null
    description?: NullableStringFieldUpdateOperationsInput | string | null
    affectedPopulation?: IntFieldUpdateOperationsInput | number
    status?: EnumCrisisStatusFieldUpdateOperationsInput | $Enums.CrisisStatus
    createdById?: StringFieldUpdateOperationsInput | string
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    decisions?: DecisionUncheckedUpdateManyWithoutCrisisNestedInput
  }

  export type UserCreateWithoutAuditDecisionsInput = {
    id: string
    name: string
    email: string
    emailVerified?: boolean
    image?: string | null
    createdAt?: Date | string
    updatedAt?: Date | string
    role?: $Enums.UserRole
    organization?: string | null
    country?: string | null
    sessions?: SessionCreateNestedManyWithoutUserInput
    accounts?: AccountCreateNestedManyWithoutUserInput
    decisions?: DecisionCreateNestedManyWithoutMadeByInput
    crises?: CrisisCreateNestedManyWithoutCreatedByInput
  }

  export type UserUncheckedCreateWithoutAuditDecisionsInput = {
    id: string
    name: string
    email: string
    emailVerified?: boolean
    image?: string | null
    createdAt?: Date | string
    updatedAt?: Date | string
    role?: $Enums.UserRole
    organization?: string | null
    country?: string | null
    sessions?: SessionUncheckedCreateNestedManyWithoutUserInput
    accounts?: AccountUncheckedCreateNestedManyWithoutUserInput
    decisions?: DecisionUncheckedCreateNestedManyWithoutMadeByInput
    crises?: CrisisUncheckedCreateNestedManyWithoutCreatedByInput
  }

  export type UserCreateOrConnectWithoutAuditDecisionsInput = {
    where: UserWhereUniqueInput
    create: XOR<UserCreateWithoutAuditDecisionsInput, UserUncheckedCreateWithoutAuditDecisionsInput>
  }

  export type EvidenceCreateWithoutAuditDecisionInput = {
    id?: string
    type: $Enums.EvidenceType
    filename: string
    size: number
    hash?: string | null
    metadata?: NullableJsonNullValueInput | InputJsonValue
    createdAt?: Date | string
  }

  export type EvidenceUncheckedCreateWithoutAuditDecisionInput = {
    id?: string
    type: $Enums.EvidenceType
    filename: string
    size: number
    hash?: string | null
    metadata?: NullableJsonNullValueInput | InputJsonValue
    createdAt?: Date | string
  }

  export type EvidenceCreateOrConnectWithoutAuditDecisionInput = {
    where: EvidenceWhereUniqueInput
    create: XOR<EvidenceCreateWithoutAuditDecisionInput, EvidenceUncheckedCreateWithoutAuditDecisionInput>
  }

  export type EvidenceCreateManyAuditDecisionInputEnvelope = {
    data: EvidenceCreateManyAuditDecisionInput | EvidenceCreateManyAuditDecisionInput[]
    skipDuplicates?: boolean
  }

  export type UserUpsertWithoutAuditDecisionsInput = {
    update: XOR<UserUpdateWithoutAuditDecisionsInput, UserUncheckedUpdateWithoutAuditDecisionsInput>
    create: XOR<UserCreateWithoutAuditDecisionsInput, UserUncheckedCreateWithoutAuditDecisionsInput>
    where?: UserWhereInput
  }

  export type UserUpdateToOneWithWhereWithoutAuditDecisionsInput = {
    where?: UserWhereInput
    data: XOR<UserUpdateWithoutAuditDecisionsInput, UserUncheckedUpdateWithoutAuditDecisionsInput>
  }

  export type UserUpdateWithoutAuditDecisionsInput = {
    id?: StringFieldUpdateOperationsInput | string
    name?: StringFieldUpdateOperationsInput | string
    email?: StringFieldUpdateOperationsInput | string
    emailVerified?: BoolFieldUpdateOperationsInput | boolean
    image?: NullableStringFieldUpdateOperationsInput | string | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    role?: EnumUserRoleFieldUpdateOperationsInput | $Enums.UserRole
    organization?: NullableStringFieldUpdateOperationsInput | string | null
    country?: NullableStringFieldUpdateOperationsInput | string | null
    sessions?: SessionUpdateManyWithoutUserNestedInput
    accounts?: AccountUpdateManyWithoutUserNestedInput
    decisions?: DecisionUpdateManyWithoutMadeByNestedInput
    crises?: CrisisUpdateManyWithoutCreatedByNestedInput
  }

  export type UserUncheckedUpdateWithoutAuditDecisionsInput = {
    id?: StringFieldUpdateOperationsInput | string
    name?: StringFieldUpdateOperationsInput | string
    email?: StringFieldUpdateOperationsInput | string
    emailVerified?: BoolFieldUpdateOperationsInput | boolean
    image?: NullableStringFieldUpdateOperationsInput | string | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    role?: EnumUserRoleFieldUpdateOperationsInput | $Enums.UserRole
    organization?: NullableStringFieldUpdateOperationsInput | string | null
    country?: NullableStringFieldUpdateOperationsInput | string | null
    sessions?: SessionUncheckedUpdateManyWithoutUserNestedInput
    accounts?: AccountUncheckedUpdateManyWithoutUserNestedInput
    decisions?: DecisionUncheckedUpdateManyWithoutMadeByNestedInput
    crises?: CrisisUncheckedUpdateManyWithoutCreatedByNestedInput
  }

  export type EvidenceUpsertWithWhereUniqueWithoutAuditDecisionInput = {
    where: EvidenceWhereUniqueInput
    update: XOR<EvidenceUpdateWithoutAuditDecisionInput, EvidenceUncheckedUpdateWithoutAuditDecisionInput>
    create: XOR<EvidenceCreateWithoutAuditDecisionInput, EvidenceUncheckedCreateWithoutAuditDecisionInput>
  }

  export type EvidenceUpdateWithWhereUniqueWithoutAuditDecisionInput = {
    where: EvidenceWhereUniqueInput
    data: XOR<EvidenceUpdateWithoutAuditDecisionInput, EvidenceUncheckedUpdateWithoutAuditDecisionInput>
  }

  export type EvidenceUpdateManyWithWhereWithoutAuditDecisionInput = {
    where: EvidenceScalarWhereInput
    data: XOR<EvidenceUpdateManyMutationInput, EvidenceUncheckedUpdateManyWithoutAuditDecisionInput>
  }

  export type EvidenceScalarWhereInput = {
    AND?: EvidenceScalarWhereInput | EvidenceScalarWhereInput[]
    OR?: EvidenceScalarWhereInput[]
    NOT?: EvidenceScalarWhereInput | EvidenceScalarWhereInput[]
    id?: StringFilter<"Evidence"> | string
    auditDecisionId?: StringFilter<"Evidence"> | string
    type?: EnumEvidenceTypeFilter<"Evidence"> | $Enums.EvidenceType
    filename?: StringFilter<"Evidence"> | string
    size?: IntFilter<"Evidence"> | number
    hash?: StringNullableFilter<"Evidence"> | string | null
    metadata?: JsonNullableFilter<"Evidence">
    createdAt?: DateTimeFilter<"Evidence"> | Date | string
  }

  export type AuditDecisionCreateWithoutEvidenceInput = {
    id?: string
    title: string
    type: $Enums.AuditDecisionType
    decisionMade: string
    rationale: string
    riskLevel: $Enums.RiskLevel
    informationSources: JsonNullValueInput | InputJsonValue
    stakeholders: JsonNullValueInput | InputJsonValue
    alternatives?: string | null
    locationLat?: number | null
    locationLng?: number | null
    locationAddress?: string | null
    deviceId?: string
    status?: $Enums.AuditStatus
    syncStatus?: $Enums.SyncStatus
    tags?: JsonNullValueInput | InputJsonValue
    priority?: $Enums.Priority
    cryptoHash?: string | null
    createdAt?: Date | string
    updatedAt?: Date | string
    createdBy: UserCreateNestedOneWithoutAuditDecisionsInput
  }

  export type AuditDecisionUncheckedCreateWithoutEvidenceInput = {
    id?: string
    title: string
    type: $Enums.AuditDecisionType
    decisionMade: string
    rationale: string
    riskLevel: $Enums.RiskLevel
    informationSources: JsonNullValueInput | InputJsonValue
    stakeholders: JsonNullValueInput | InputJsonValue
    alternatives?: string | null
    locationLat?: number | null
    locationLng?: number | null
    locationAddress?: string | null
    deviceId?: string
    status?: $Enums.AuditStatus
    syncStatus?: $Enums.SyncStatus
    tags?: JsonNullValueInput | InputJsonValue
    priority?: $Enums.Priority
    cryptoHash?: string | null
    createdById: string
    createdAt?: Date | string
    updatedAt?: Date | string
  }

  export type AuditDecisionCreateOrConnectWithoutEvidenceInput = {
    where: AuditDecisionWhereUniqueInput
    create: XOR<AuditDecisionCreateWithoutEvidenceInput, AuditDecisionUncheckedCreateWithoutEvidenceInput>
  }

  export type AuditDecisionUpsertWithoutEvidenceInput = {
    update: XOR<AuditDecisionUpdateWithoutEvidenceInput, AuditDecisionUncheckedUpdateWithoutEvidenceInput>
    create: XOR<AuditDecisionCreateWithoutEvidenceInput, AuditDecisionUncheckedCreateWithoutEvidenceInput>
    where?: AuditDecisionWhereInput
  }

  export type AuditDecisionUpdateToOneWithWhereWithoutEvidenceInput = {
    where?: AuditDecisionWhereInput
    data: XOR<AuditDecisionUpdateWithoutEvidenceInput, AuditDecisionUncheckedUpdateWithoutEvidenceInput>
  }

  export type AuditDecisionUpdateWithoutEvidenceInput = {
    id?: StringFieldUpdateOperationsInput | string
    title?: StringFieldUpdateOperationsInput | string
    type?: EnumAuditDecisionTypeFieldUpdateOperationsInput | $Enums.AuditDecisionType
    decisionMade?: StringFieldUpdateOperationsInput | string
    rationale?: StringFieldUpdateOperationsInput | string
    riskLevel?: EnumRiskLevelFieldUpdateOperationsInput | $Enums.RiskLevel
    informationSources?: JsonNullValueInput | InputJsonValue
    stakeholders?: JsonNullValueInput | InputJsonValue
    alternatives?: NullableStringFieldUpdateOperationsInput | string | null
    locationLat?: NullableFloatFieldUpdateOperationsInput | number | null
    locationLng?: NullableFloatFieldUpdateOperationsInput | number | null
    locationAddress?: NullableStringFieldUpdateOperationsInput | string | null
    deviceId?: StringFieldUpdateOperationsInput | string
    status?: EnumAuditStatusFieldUpdateOperationsInput | $Enums.AuditStatus
    syncStatus?: EnumSyncStatusFieldUpdateOperationsInput | $Enums.SyncStatus
    tags?: JsonNullValueInput | InputJsonValue
    priority?: EnumPriorityFieldUpdateOperationsInput | $Enums.Priority
    cryptoHash?: NullableStringFieldUpdateOperationsInput | string | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    createdBy?: UserUpdateOneRequiredWithoutAuditDecisionsNestedInput
  }

  export type AuditDecisionUncheckedUpdateWithoutEvidenceInput = {
    id?: StringFieldUpdateOperationsInput | string
    title?: StringFieldUpdateOperationsInput | string
    type?: EnumAuditDecisionTypeFieldUpdateOperationsInput | $Enums.AuditDecisionType
    decisionMade?: StringFieldUpdateOperationsInput | string
    rationale?: StringFieldUpdateOperationsInput | string
    riskLevel?: EnumRiskLevelFieldUpdateOperationsInput | $Enums.RiskLevel
    informationSources?: JsonNullValueInput | InputJsonValue
    stakeholders?: JsonNullValueInput | InputJsonValue
    alternatives?: NullableStringFieldUpdateOperationsInput | string | null
    locationLat?: NullableFloatFieldUpdateOperationsInput | number | null
    locationLng?: NullableFloatFieldUpdateOperationsInput | number | null
    locationAddress?: NullableStringFieldUpdateOperationsInput | string | null
    deviceId?: StringFieldUpdateOperationsInput | string
    status?: EnumAuditStatusFieldUpdateOperationsInput | $Enums.AuditStatus
    syncStatus?: EnumSyncStatusFieldUpdateOperationsInput | $Enums.SyncStatus
    tags?: JsonNullValueInput | InputJsonValue
    priority?: EnumPriorityFieldUpdateOperationsInput | $Enums.Priority
    cryptoHash?: NullableStringFieldUpdateOperationsInput | string | null
    createdById?: StringFieldUpdateOperationsInput | string
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type SessionCreateManyUserInput = {
    id: string
    expiresAt: Date | string
    token: string
    createdAt?: Date | string
    updatedAt?: Date | string
    ipAddress?: string | null
    userAgent?: string | null
  }

  export type AccountCreateManyUserInput = {
    id: string
    accountId: string
    providerId: string
    accessToken?: string | null
    refreshToken?: string | null
    idToken?: string | null
    accessTokenExpiresAt?: Date | string | null
    refreshTokenExpiresAt?: Date | string | null
    scope?: string | null
    password?: string | null
    createdAt?: Date | string
    updatedAt?: Date | string
  }

  export type DecisionCreateManyMadeByInput = {
    id?: string
    crisisId: string
    title: string
    decisionText: string
    rationale?: string | null
    confidenceScore?: number
    optionA?: string | null
    optionB?: string | null
    optionC?: string | null
    selectedOption: $Enums.SelectedOption
    outcome?: string | null
    createdAt?: Date | string
    updatedAt?: Date | string
  }

  export type AuditDecisionCreateManyCreatedByInput = {
    id?: string
    title: string
    type: $Enums.AuditDecisionType
    decisionMade: string
    rationale: string
    riskLevel: $Enums.RiskLevel
    informationSources: JsonNullValueInput | InputJsonValue
    stakeholders: JsonNullValueInput | InputJsonValue
    alternatives?: string | null
    locationLat?: number | null
    locationLng?: number | null
    locationAddress?: string | null
    deviceId?: string
    status?: $Enums.AuditStatus
    syncStatus?: $Enums.SyncStatus
    tags?: JsonNullValueInput | InputJsonValue
    priority?: $Enums.Priority
    cryptoHash?: string | null
    createdAt?: Date | string
    updatedAt?: Date | string
  }

  export type CrisisCreateManyCreatedByInput = {
    id?: string
    title: string
    type: $Enums.CrisisType
    severity: $Enums.CrisisSeverity
    location: string
    latitude?: number | null
    longitude?: number | null
    description?: string | null
    affectedPopulation?: number
    status?: $Enums.CrisisStatus
    createdAt?: Date | string
    updatedAt?: Date | string
  }

  export type SessionUpdateWithoutUserInput = {
    id?: StringFieldUpdateOperationsInput | string
    expiresAt?: DateTimeFieldUpdateOperationsInput | Date | string
    token?: StringFieldUpdateOperationsInput | string
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    ipAddress?: NullableStringFieldUpdateOperationsInput | string | null
    userAgent?: NullableStringFieldUpdateOperationsInput | string | null
  }

  export type SessionUncheckedUpdateWithoutUserInput = {
    id?: StringFieldUpdateOperationsInput | string
    expiresAt?: DateTimeFieldUpdateOperationsInput | Date | string
    token?: StringFieldUpdateOperationsInput | string
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    ipAddress?: NullableStringFieldUpdateOperationsInput | string | null
    userAgent?: NullableStringFieldUpdateOperationsInput | string | null
  }

  export type SessionUncheckedUpdateManyWithoutUserInput = {
    id?: StringFieldUpdateOperationsInput | string
    expiresAt?: DateTimeFieldUpdateOperationsInput | Date | string
    token?: StringFieldUpdateOperationsInput | string
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    ipAddress?: NullableStringFieldUpdateOperationsInput | string | null
    userAgent?: NullableStringFieldUpdateOperationsInput | string | null
  }

  export type AccountUpdateWithoutUserInput = {
    id?: StringFieldUpdateOperationsInput | string
    accountId?: StringFieldUpdateOperationsInput | string
    providerId?: StringFieldUpdateOperationsInput | string
    accessToken?: NullableStringFieldUpdateOperationsInput | string | null
    refreshToken?: NullableStringFieldUpdateOperationsInput | string | null
    idToken?: NullableStringFieldUpdateOperationsInput | string | null
    accessTokenExpiresAt?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    refreshTokenExpiresAt?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    scope?: NullableStringFieldUpdateOperationsInput | string | null
    password?: NullableStringFieldUpdateOperationsInput | string | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type AccountUncheckedUpdateWithoutUserInput = {
    id?: StringFieldUpdateOperationsInput | string
    accountId?: StringFieldUpdateOperationsInput | string
    providerId?: StringFieldUpdateOperationsInput | string
    accessToken?: NullableStringFieldUpdateOperationsInput | string | null
    refreshToken?: NullableStringFieldUpdateOperationsInput | string | null
    idToken?: NullableStringFieldUpdateOperationsInput | string | null
    accessTokenExpiresAt?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    refreshTokenExpiresAt?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    scope?: NullableStringFieldUpdateOperationsInput | string | null
    password?: NullableStringFieldUpdateOperationsInput | string | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type AccountUncheckedUpdateManyWithoutUserInput = {
    id?: StringFieldUpdateOperationsInput | string
    accountId?: StringFieldUpdateOperationsInput | string
    providerId?: StringFieldUpdateOperationsInput | string
    accessToken?: NullableStringFieldUpdateOperationsInput | string | null
    refreshToken?: NullableStringFieldUpdateOperationsInput | string | null
    idToken?: NullableStringFieldUpdateOperationsInput | string | null
    accessTokenExpiresAt?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    refreshTokenExpiresAt?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    scope?: NullableStringFieldUpdateOperationsInput | string | null
    password?: NullableStringFieldUpdateOperationsInput | string | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type DecisionUpdateWithoutMadeByInput = {
    id?: StringFieldUpdateOperationsInput | string
    title?: StringFieldUpdateOperationsInput | string
    decisionText?: StringFieldUpdateOperationsInput | string
    rationale?: NullableStringFieldUpdateOperationsInput | string | null
    confidenceScore?: IntFieldUpdateOperationsInput | number
    optionA?: NullableStringFieldUpdateOperationsInput | string | null
    optionB?: NullableStringFieldUpdateOperationsInput | string | null
    optionC?: NullableStringFieldUpdateOperationsInput | string | null
    selectedOption?: EnumSelectedOptionFieldUpdateOperationsInput | $Enums.SelectedOption
    outcome?: NullableStringFieldUpdateOperationsInput | string | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    crisis?: CrisisUpdateOneRequiredWithoutDecisionsNestedInput
  }

  export type DecisionUncheckedUpdateWithoutMadeByInput = {
    id?: StringFieldUpdateOperationsInput | string
    crisisId?: StringFieldUpdateOperationsInput | string
    title?: StringFieldUpdateOperationsInput | string
    decisionText?: StringFieldUpdateOperationsInput | string
    rationale?: NullableStringFieldUpdateOperationsInput | string | null
    confidenceScore?: IntFieldUpdateOperationsInput | number
    optionA?: NullableStringFieldUpdateOperationsInput | string | null
    optionB?: NullableStringFieldUpdateOperationsInput | string | null
    optionC?: NullableStringFieldUpdateOperationsInput | string | null
    selectedOption?: EnumSelectedOptionFieldUpdateOperationsInput | $Enums.SelectedOption
    outcome?: NullableStringFieldUpdateOperationsInput | string | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type DecisionUncheckedUpdateManyWithoutMadeByInput = {
    id?: StringFieldUpdateOperationsInput | string
    crisisId?: StringFieldUpdateOperationsInput | string
    title?: StringFieldUpdateOperationsInput | string
    decisionText?: StringFieldUpdateOperationsInput | string
    rationale?: NullableStringFieldUpdateOperationsInput | string | null
    confidenceScore?: IntFieldUpdateOperationsInput | number
    optionA?: NullableStringFieldUpdateOperationsInput | string | null
    optionB?: NullableStringFieldUpdateOperationsInput | string | null
    optionC?: NullableStringFieldUpdateOperationsInput | string | null
    selectedOption?: EnumSelectedOptionFieldUpdateOperationsInput | $Enums.SelectedOption
    outcome?: NullableStringFieldUpdateOperationsInput | string | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type AuditDecisionUpdateWithoutCreatedByInput = {
    id?: StringFieldUpdateOperationsInput | string
    title?: StringFieldUpdateOperationsInput | string
    type?: EnumAuditDecisionTypeFieldUpdateOperationsInput | $Enums.AuditDecisionType
    decisionMade?: StringFieldUpdateOperationsInput | string
    rationale?: StringFieldUpdateOperationsInput | string
    riskLevel?: EnumRiskLevelFieldUpdateOperationsInput | $Enums.RiskLevel
    informationSources?: JsonNullValueInput | InputJsonValue
    stakeholders?: JsonNullValueInput | InputJsonValue
    alternatives?: NullableStringFieldUpdateOperationsInput | string | null
    locationLat?: NullableFloatFieldUpdateOperationsInput | number | null
    locationLng?: NullableFloatFieldUpdateOperationsInput | number | null
    locationAddress?: NullableStringFieldUpdateOperationsInput | string | null
    deviceId?: StringFieldUpdateOperationsInput | string
    status?: EnumAuditStatusFieldUpdateOperationsInput | $Enums.AuditStatus
    syncStatus?: EnumSyncStatusFieldUpdateOperationsInput | $Enums.SyncStatus
    tags?: JsonNullValueInput | InputJsonValue
    priority?: EnumPriorityFieldUpdateOperationsInput | $Enums.Priority
    cryptoHash?: NullableStringFieldUpdateOperationsInput | string | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    evidence?: EvidenceUpdateManyWithoutAuditDecisionNestedInput
  }

  export type AuditDecisionUncheckedUpdateWithoutCreatedByInput = {
    id?: StringFieldUpdateOperationsInput | string
    title?: StringFieldUpdateOperationsInput | string
    type?: EnumAuditDecisionTypeFieldUpdateOperationsInput | $Enums.AuditDecisionType
    decisionMade?: StringFieldUpdateOperationsInput | string
    rationale?: StringFieldUpdateOperationsInput | string
    riskLevel?: EnumRiskLevelFieldUpdateOperationsInput | $Enums.RiskLevel
    informationSources?: JsonNullValueInput | InputJsonValue
    stakeholders?: JsonNullValueInput | InputJsonValue
    alternatives?: NullableStringFieldUpdateOperationsInput | string | null
    locationLat?: NullableFloatFieldUpdateOperationsInput | number | null
    locationLng?: NullableFloatFieldUpdateOperationsInput | number | null
    locationAddress?: NullableStringFieldUpdateOperationsInput | string | null
    deviceId?: StringFieldUpdateOperationsInput | string
    status?: EnumAuditStatusFieldUpdateOperationsInput | $Enums.AuditStatus
    syncStatus?: EnumSyncStatusFieldUpdateOperationsInput | $Enums.SyncStatus
    tags?: JsonNullValueInput | InputJsonValue
    priority?: EnumPriorityFieldUpdateOperationsInput | $Enums.Priority
    cryptoHash?: NullableStringFieldUpdateOperationsInput | string | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    evidence?: EvidenceUncheckedUpdateManyWithoutAuditDecisionNestedInput
  }

  export type AuditDecisionUncheckedUpdateManyWithoutCreatedByInput = {
    id?: StringFieldUpdateOperationsInput | string
    title?: StringFieldUpdateOperationsInput | string
    type?: EnumAuditDecisionTypeFieldUpdateOperationsInput | $Enums.AuditDecisionType
    decisionMade?: StringFieldUpdateOperationsInput | string
    rationale?: StringFieldUpdateOperationsInput | string
    riskLevel?: EnumRiskLevelFieldUpdateOperationsInput | $Enums.RiskLevel
    informationSources?: JsonNullValueInput | InputJsonValue
    stakeholders?: JsonNullValueInput | InputJsonValue
    alternatives?: NullableStringFieldUpdateOperationsInput | string | null
    locationLat?: NullableFloatFieldUpdateOperationsInput | number | null
    locationLng?: NullableFloatFieldUpdateOperationsInput | number | null
    locationAddress?: NullableStringFieldUpdateOperationsInput | string | null
    deviceId?: StringFieldUpdateOperationsInput | string
    status?: EnumAuditStatusFieldUpdateOperationsInput | $Enums.AuditStatus
    syncStatus?: EnumSyncStatusFieldUpdateOperationsInput | $Enums.SyncStatus
    tags?: JsonNullValueInput | InputJsonValue
    priority?: EnumPriorityFieldUpdateOperationsInput | $Enums.Priority
    cryptoHash?: NullableStringFieldUpdateOperationsInput | string | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type CrisisUpdateWithoutCreatedByInput = {
    id?: StringFieldUpdateOperationsInput | string
    title?: StringFieldUpdateOperationsInput | string
    type?: EnumCrisisTypeFieldUpdateOperationsInput | $Enums.CrisisType
    severity?: EnumCrisisSeverityFieldUpdateOperationsInput | $Enums.CrisisSeverity
    location?: StringFieldUpdateOperationsInput | string
    latitude?: NullableFloatFieldUpdateOperationsInput | number | null
    longitude?: NullableFloatFieldUpdateOperationsInput | number | null
    description?: NullableStringFieldUpdateOperationsInput | string | null
    affectedPopulation?: IntFieldUpdateOperationsInput | number
    status?: EnumCrisisStatusFieldUpdateOperationsInput | $Enums.CrisisStatus
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    decisions?: DecisionUpdateManyWithoutCrisisNestedInput
    alerts?: AlertUpdateManyWithoutCrisisNestedInput
  }

  export type CrisisUncheckedUpdateWithoutCreatedByInput = {
    id?: StringFieldUpdateOperationsInput | string
    title?: StringFieldUpdateOperationsInput | string
    type?: EnumCrisisTypeFieldUpdateOperationsInput | $Enums.CrisisType
    severity?: EnumCrisisSeverityFieldUpdateOperationsInput | $Enums.CrisisSeverity
    location?: StringFieldUpdateOperationsInput | string
    latitude?: NullableFloatFieldUpdateOperationsInput | number | null
    longitude?: NullableFloatFieldUpdateOperationsInput | number | null
    description?: NullableStringFieldUpdateOperationsInput | string | null
    affectedPopulation?: IntFieldUpdateOperationsInput | number
    status?: EnumCrisisStatusFieldUpdateOperationsInput | $Enums.CrisisStatus
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    decisions?: DecisionUncheckedUpdateManyWithoutCrisisNestedInput
    alerts?: AlertUncheckedUpdateManyWithoutCrisisNestedInput
  }

  export type CrisisUncheckedUpdateManyWithoutCreatedByInput = {
    id?: StringFieldUpdateOperationsInput | string
    title?: StringFieldUpdateOperationsInput | string
    type?: EnumCrisisTypeFieldUpdateOperationsInput | $Enums.CrisisType
    severity?: EnumCrisisSeverityFieldUpdateOperationsInput | $Enums.CrisisSeverity
    location?: StringFieldUpdateOperationsInput | string
    latitude?: NullableFloatFieldUpdateOperationsInput | number | null
    longitude?: NullableFloatFieldUpdateOperationsInput | number | null
    description?: NullableStringFieldUpdateOperationsInput | string | null
    affectedPopulation?: IntFieldUpdateOperationsInput | number
    status?: EnumCrisisStatusFieldUpdateOperationsInput | $Enums.CrisisStatus
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type DecisionCreateManyCrisisInput = {
    id?: string
    title: string
    decisionText: string
    rationale?: string | null
    confidenceScore?: number
    optionA?: string | null
    optionB?: string | null
    optionC?: string | null
    selectedOption: $Enums.SelectedOption
    outcome?: string | null
    madeById: string
    createdAt?: Date | string
    updatedAt?: Date | string
  }

  export type AlertCreateManyCrisisInput = {
    id?: string
    type: $Enums.AlertType
    severity: $Enums.AlertSeverity
    message: string
    isActive?: boolean
    triggeredAt?: Date | string
    resolvedAt?: Date | string | null
  }

  export type DecisionUpdateWithoutCrisisInput = {
    id?: StringFieldUpdateOperationsInput | string
    title?: StringFieldUpdateOperationsInput | string
    decisionText?: StringFieldUpdateOperationsInput | string
    rationale?: NullableStringFieldUpdateOperationsInput | string | null
    confidenceScore?: IntFieldUpdateOperationsInput | number
    optionA?: NullableStringFieldUpdateOperationsInput | string | null
    optionB?: NullableStringFieldUpdateOperationsInput | string | null
    optionC?: NullableStringFieldUpdateOperationsInput | string | null
    selectedOption?: EnumSelectedOptionFieldUpdateOperationsInput | $Enums.SelectedOption
    outcome?: NullableStringFieldUpdateOperationsInput | string | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    madeBy?: UserUpdateOneRequiredWithoutDecisionsNestedInput
  }

  export type DecisionUncheckedUpdateWithoutCrisisInput = {
    id?: StringFieldUpdateOperationsInput | string
    title?: StringFieldUpdateOperationsInput | string
    decisionText?: StringFieldUpdateOperationsInput | string
    rationale?: NullableStringFieldUpdateOperationsInput | string | null
    confidenceScore?: IntFieldUpdateOperationsInput | number
    optionA?: NullableStringFieldUpdateOperationsInput | string | null
    optionB?: NullableStringFieldUpdateOperationsInput | string | null
    optionC?: NullableStringFieldUpdateOperationsInput | string | null
    selectedOption?: EnumSelectedOptionFieldUpdateOperationsInput | $Enums.SelectedOption
    outcome?: NullableStringFieldUpdateOperationsInput | string | null
    madeById?: StringFieldUpdateOperationsInput | string
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type DecisionUncheckedUpdateManyWithoutCrisisInput = {
    id?: StringFieldUpdateOperationsInput | string
    title?: StringFieldUpdateOperationsInput | string
    decisionText?: StringFieldUpdateOperationsInput | string
    rationale?: NullableStringFieldUpdateOperationsInput | string | null
    confidenceScore?: IntFieldUpdateOperationsInput | number
    optionA?: NullableStringFieldUpdateOperationsInput | string | null
    optionB?: NullableStringFieldUpdateOperationsInput | string | null
    optionC?: NullableStringFieldUpdateOperationsInput | string | null
    selectedOption?: EnumSelectedOptionFieldUpdateOperationsInput | $Enums.SelectedOption
    outcome?: NullableStringFieldUpdateOperationsInput | string | null
    madeById?: StringFieldUpdateOperationsInput | string
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type AlertUpdateWithoutCrisisInput = {
    id?: StringFieldUpdateOperationsInput | string
    type?: EnumAlertTypeFieldUpdateOperationsInput | $Enums.AlertType
    severity?: EnumAlertSeverityFieldUpdateOperationsInput | $Enums.AlertSeverity
    message?: StringFieldUpdateOperationsInput | string
    isActive?: BoolFieldUpdateOperationsInput | boolean
    triggeredAt?: DateTimeFieldUpdateOperationsInput | Date | string
    resolvedAt?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
  }

  export type AlertUncheckedUpdateWithoutCrisisInput = {
    id?: StringFieldUpdateOperationsInput | string
    type?: EnumAlertTypeFieldUpdateOperationsInput | $Enums.AlertType
    severity?: EnumAlertSeverityFieldUpdateOperationsInput | $Enums.AlertSeverity
    message?: StringFieldUpdateOperationsInput | string
    isActive?: BoolFieldUpdateOperationsInput | boolean
    triggeredAt?: DateTimeFieldUpdateOperationsInput | Date | string
    resolvedAt?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
  }

  export type AlertUncheckedUpdateManyWithoutCrisisInput = {
    id?: StringFieldUpdateOperationsInput | string
    type?: EnumAlertTypeFieldUpdateOperationsInput | $Enums.AlertType
    severity?: EnumAlertSeverityFieldUpdateOperationsInput | $Enums.AlertSeverity
    message?: StringFieldUpdateOperationsInput | string
    isActive?: BoolFieldUpdateOperationsInput | boolean
    triggeredAt?: DateTimeFieldUpdateOperationsInput | Date | string
    resolvedAt?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
  }

  export type EvidenceCreateManyAuditDecisionInput = {
    id?: string
    type: $Enums.EvidenceType
    filename: string
    size: number
    hash?: string | null
    metadata?: NullableJsonNullValueInput | InputJsonValue
    createdAt?: Date | string
  }

  export type EvidenceUpdateWithoutAuditDecisionInput = {
    id?: StringFieldUpdateOperationsInput | string
    type?: EnumEvidenceTypeFieldUpdateOperationsInput | $Enums.EvidenceType
    filename?: StringFieldUpdateOperationsInput | string
    size?: IntFieldUpdateOperationsInput | number
    hash?: NullableStringFieldUpdateOperationsInput | string | null
    metadata?: NullableJsonNullValueInput | InputJsonValue
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type EvidenceUncheckedUpdateWithoutAuditDecisionInput = {
    id?: StringFieldUpdateOperationsInput | string
    type?: EnumEvidenceTypeFieldUpdateOperationsInput | $Enums.EvidenceType
    filename?: StringFieldUpdateOperationsInput | string
    size?: IntFieldUpdateOperationsInput | number
    hash?: NullableStringFieldUpdateOperationsInput | string | null
    metadata?: NullableJsonNullValueInput | InputJsonValue
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type EvidenceUncheckedUpdateManyWithoutAuditDecisionInput = {
    id?: StringFieldUpdateOperationsInput | string
    type?: EnumEvidenceTypeFieldUpdateOperationsInput | $Enums.EvidenceType
    filename?: StringFieldUpdateOperationsInput | string
    size?: IntFieldUpdateOperationsInput | number
    hash?: NullableStringFieldUpdateOperationsInput | string | null
    metadata?: NullableJsonNullValueInput | InputJsonValue
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }



  /**
   * Batch Payload for updateMany & deleteMany & createMany
   */

  export type BatchPayload = {
    count: number
  }

  /**
   * DMMF
   */
  export const dmmf: runtime.BaseDMMF
}