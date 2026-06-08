import * as cdk from "aws-cdk-lib";
import * as ec2 from "aws-cdk-lib/aws-ec2";
import * as rds from "aws-cdk-lib/aws-rds";
import * as elasticache from "aws-cdk-lib/aws-elasticache";
import * as secretsmanager from "aws-cdk-lib/aws-secretsmanager";
import { Construct } from "constructs";

interface DataStackProps extends cdk.StackProps {
  stage: string;
  vpc: ec2.Vpc;
  dbSecurityGroup: ec2.SecurityGroup;
  cacheSecurityGroup: ec2.SecurityGroup;
}

export class DataStack extends cdk.Stack {
  public readonly dbSecret: secretsmanager.ISecret;
  public readonly redisEndpoint: string;
  public readonly dbCluster: rds.DatabaseCluster;

  constructor(scope: Construct, id: string, props: DataStackProps) {
    super(scope, id, props);

    const { stage, vpc, dbSecurityGroup, cacheSecurityGroup } = props;

    const isProd = stage === "prod";

    // ----------------------------------------------------------------
    // RDS Aurora PostgreSQL Serverless v2
    //
    // Cost rationale: Aurora Serverless v2 scales ACUs (Aurora Capacity Units)
    // between a min and max. At 0.5 ACU min (~$0.06/hr when idle) vs a fixed
    // db.t3.medium (~$0.068/hr always-on), Serverless v2 wins for variable
    // workloads like a pilot. At scale, we can switch to provisioned r6g instances.
    //
    // PostGIS + TimescaleDB: install via RDS custom parameter group + init SQL
    // run once after first deploy (see db-init/init.sql in the app repo).
    // ----------------------------------------------------------------
    const dbSubnetGroup = new rds.SubnetGroup(this, "DbSubnetGroup", {
      description: "FleetGuard RDS subnet group",
      vpc,
      removalPolicy: isProd ? cdk.RemovalPolicy.RETAIN : cdk.RemovalPolicy.DESTROY,
      vpcSubnets: { subnetType: ec2.SubnetType.PRIVATE_ISOLATED },
    });

    const dbParameterGroup = new rds.ParameterGroup(this, "DbParamGroup", {
      engine: rds.DatabaseClusterEngine.auroraPostgres({
        version: rds.AuroraPostgresEngineVersion.VER_16_9,
      }),
      description: "FleetGuard Aurora PostgreSQL 16 PostGIS + TimescaleDB",
      parameters: {
        // TimescaleDB and PostGIS are loaded via shared_preload_libraries.
        // Add timescaledb here once the extension is confirmed available
        // in af-south-1 Aurora; otherwise load via init SQL on app startup.
        "shared_preload_libraries": "pg_stat_statements",
        "log_min_duration_statement": "1000", // log queries > 1s
        "rds.force_ssl": "1",
      },
    });

    this.dbCluster = new rds.DatabaseCluster(this, "DbCluster", {
      clusterIdentifier: `fleetguard-${stage}`,
      engine: rds.DatabaseClusterEngine.auroraPostgres({
        version: rds.AuroraPostgresEngineVersion.VER_16_9,
      }),
      serverlessV2MinCapacity: 0.5,  // ~$0.06/hr at idle
      serverlessV2MaxCapacity: isProd ? 16 : 4,
      writer: rds.ClusterInstance.serverlessV2("Writer", {
        publiclyAccessible: false,
      }),
      parameterGroup: dbParameterGroup,
      // Reader for analytics queries and trip replay (read-heavy).
      // Only provision in prod to save cost in staging.
      readers: isProd
        ? [
          rds.ClusterInstance.serverlessV2("Reader", {
            scaleWithWriter: true,
          }),
        ]
        : [],
      vpc,
      vpcSubnets: { subnetType: ec2.SubnetType.PRIVATE_ISOLATED },
      securityGroups: [dbSecurityGroup],
      subnetGroup: dbSubnetGroup,
      defaultDatabaseName: "fleetguard",
      storageEncrypted: true,
      deletionProtection: isProd,
      removalPolicy: isProd ? cdk.RemovalPolicy.RETAIN : cdk.RemovalPolicy.DESTROY,
      backup: {
        retention: cdk.Duration.days(isProd ? 14 : 1),
        preferredWindow: "02:00-03:00", // 2-3 AM UTC (5 AM WAT)
      },
      cloudwatchLogsExports: ["postgresql"],
      cloudwatchLogsRetention: cdk.aws_logs.RetentionDays.ONE_MONTH,
    });

    this.dbSecret = this.dbCluster.secret!;

    // ----------------------------------------------------------------
    // ElastiCache Redis (Serverless)
    //
    // Pay per ECU and GB stored.
    // For FleetGuard's use (session store, alert dedup, pub/sub),
    // cost is negligible at pilot scale (~$30–60/mo) with zero cluster management.
    // At high throughput, we will switch to a provisioned cache.t4g.small cluster.
    // ----------------------------------------------------------------
    const cacheSubnetGroup = new elasticache.CfnSubnetGroup(
      this,
      "CacheSubnetGroup",
      {
        description: "FleetGuard ElastiCache subnet group",
        subnetIds: vpc.isolatedSubnets.map((s) => s.subnetId),
        cacheSubnetGroupName: `fleetguard-cache-${stage}`,
      }
    );

    const redisServerless = new elasticache.CfnServerlessCache(
      this,
      "RedisServerless",
      {
        serverlessCacheName: `fleetguard-${stage}`,
        engine: "redis",
        description: "FleetGuard session store, alert dedup, WebSocket pub/sub",
        subnetIds: vpc.isolatedSubnets.map((s) => s.subnetId),
        securityGroupIds: [cacheSecurityGroup.securityGroupId],
        cacheUsageLimits: {
          dataStorage: {
            maximum: isProd ? 10 : 1, // GB
            unit: "GB",
          },
          ecpuPerSecond: {
            maximum: isProd ? 5000 : 1000,
          },
        },
        // Snapshots retained for 1 day — Redis is a cache, not a source of truth
        snapshotRetentionLimit: 1,
      }
    );
    cacheSubnetGroup; // referenced implicitly via subnet IDs

    // ElastiCache Serverless endpoint is available as an attribute
    this.redisEndpoint = cdk.Fn.select(
      0,
      cdk.Fn.split(
        ":",
        redisServerless.attrEndpointAddress
      )
    );

    // ----------------------------------------------------------------
    // Outputs
    // ----------------------------------------------------------------
    new cdk.CfnOutput(this, "DbClusterEndpoint", {
      value: this.dbCluster.clusterEndpoint.hostname,
      exportName: "FleetGuard-DbEndpoint",
    });

    new cdk.CfnOutput(this, "DbSecretArn", {
      value: this.dbSecret.secretArn,
      exportName: "FleetGuard-DbSecretArn",
    });

    new cdk.CfnOutput(this, "RedisEndpoint", {
      value: redisServerless.attrEndpointAddress,
      exportName: "FleetGuard-RedisEndpoint",
    });
  }
}
