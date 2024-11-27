import React, { useState } from 'react';
import './App.css';
import { ConfigurationParameters, Configuration, JobApi, JobResult, scheduleFullJob, scheduleProofJob } from '@taceo/csn-client-browser';
import wc from "./witness_calculator.js"; // generated with circom

// TODO change the vars
const JOB_DEFINITION = "job-definition-id";
const ACCESS_TOKEN = "access-token";
const SERVER_URL = "https://csn.taceo.io"

const configParams: ConfigurationParameters = {
  basePath: SERVER_URL,
  accessToken: ACCESS_TOKEN,
}
const congiuration = new Configuration(configParams)
const apiInstance = new JobApi(congiuration);

const multiplier2_wasm = await fetch('multiplier2.wasm');
const witnessCalculator = await wc(await multiplier2_wasm.arrayBuffer());

const multiplier2_public_inputs: string[] = [];
const multiplier2_num_pub_inputs: number = 2;

const App: React.FC = () => {
  const [id, setId] = useState<string>(JOB_DEFINITION);
  const [json, setJson] = useState<string>('{ "a": "2", "b": "3" }');
  const [result, setResult] = useState<JobResult | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [jobType, setJobType] = useState<string>("FULL");

  const pollJobResult = async (id: string): Promise<JobResult | null> => {
    while (true) {
      try {
        const getStatusRes = await apiInstance.getStatus({ id: id });
        if (getStatusRes.status == 'Completed') {
          return getStatusRes;
        } else if (getStatusRes.status == 'Failed') {
          setError(getStatusRes.message ?? "something went wrong");
          return null;
        }
      } catch (error) {
        console.error('error:', error);
        return null;
      }
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    setLoading(true);
    setError(null);
    setResult(null);

    try {
      if (jobType == "FULL") {
        const input = JSON.parse(json);
        const jobId = await scheduleFullJob(apiInstance, id, multiplier2_public_inputs, input);
        const data = await pollJobResult(jobId);
        setResult(data);
      } else {
        const input = JSON.parse(json);
  	    const witness = await witnessCalculator.calculateWTNSBin(input, 0);
        const jobId = await scheduleProofJob(apiInstance, JOB_DEFINITION, multiplier2_num_pub_inputs, witness);
        const data = await pollJobResult(jobId);
        setResult(data);
      }
    } catch (error: any) {
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <h1>schedule job</h1>
      <form onSubmit={handleSubmit}>
        <div>
          <h2>job definition id</h2>
          <input
            type="text"
            id="id"
            value={id}
            onChange={(e) => setId(e.target.value)}
            size={32}
            required
          />
        </div>
        <div>
          <h2>input</h2>
          <textarea
            id="json"
            value={json}
            onChange={(e) => setJson(e.target.value)}
            rows={10}
            cols={40}
            required
          />
        </div>
        <div>
          <h2>type</h2>
          <select onChange={(e) => setJobType(e.target.value)}>
            <option value="FULL">full job</option>
            <option value="PROVE_ONLY">prove job with local witness extension</option>
          </select>
        </div>
        <br/>
        <button type="submit" disabled={loading}>
          {loading ? 'loading...' : 'submit'}
        </button>
      </form>

      <br/>

      {error && <div style={{ color: 'red' }}>{error}</div>}
      {result && (
        <div>
          <a href={`data:text/json;charset=utf-8,${encodeURIComponent(JSON.stringify(result))}`} download="result.json">
            job result  
          </a>
        </div>
      )}
    </div>
  );
};

export default App;
