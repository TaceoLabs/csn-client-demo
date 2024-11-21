import { ConfigurationParameters, Configuration, JobApi, JobResult, scheduleFullJob, scheduleProofJob } from '@taceo/csn-client';
import { readFileSync } from 'fs';
import wc from "./witness_calculator.js"; // generated with circom

const configParams: ConfigurationParameters = {
  basePath: 'http://localhost:3000',
  accessToken: '123456',
}

const congiuration = new Configuration(configParams)
const apiInstance = new JobApi(congiuration);

const JOB_DEFINITION = "94f7c4cd-b1bb-466b-9d33-e140384453d3";

/**
 * Schedule a full job with witness extension on the network and get its id.
*/
async function scheduleJob(public_inputs: string[], input: any): Promise<string> {
  return scheduleFullJob(apiInstance, JOB_DEFINITION, public_inputs, input)
}

/**
 * Perform the witness extension locally with the given wasm file and schedule a job on the network and get its id.
*/
async function scheduleJobLocalWtnsExt(circuit_wasm_path: string, num_pub_inputs: number, input: any): Promise<string> {
  const wasm = readFileSync(circuit_wasm_path);
  const witnessCalculator = await wc(wasm);
	const witness = await witnessCalculator.calculateWTNSBin(input, 0);
  return scheduleProofJob(apiInstance, JOB_DEFINITION, num_pub_inputs, witness);
}

/**
 * Poll the job status and get the job result.
*/
async function pollJobResult(id: string): Promise<JobResult | null> {
  while (true) {
    try {
      const getStatusRes = await apiInstance.getStatus({ id: id });
      if (getStatusRes.status == 'Completed') {
        return getStatusRes;
      } else if (getStatusRes.status == 'Failed') {
        console.error('failed:', getStatusRes);
        return null;
      }
    } catch (error) {
      console.error('error:', error);
      return null;
    }
    await new Promise(resolve => setTimeout(resolve, 1000));
  }
}

const public_inputs: string[] = [];

const input = {
  a: "2",
  b: "3"
};

async function main() {
  console.log("schedule full job");
  const jobId0 = await scheduleJob(public_inputs, input);
  const result0 = await pollJobResult(jobId0);
  console.log(result0);

  console.log("perform local witness extension and schedule job");
  const jobId1 = await scheduleJobLocalWtnsExt("./multiplier2.wasm", 2, input);
  const result1 = await pollJobResult(jobId1);
  console.log(result1);
}

main()




