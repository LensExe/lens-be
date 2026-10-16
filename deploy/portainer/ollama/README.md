# Ollama Portainer stack

This stack runs Ollama and downloads the chat and embedding models required by
Lens AI Worker. It stores model files in the persistent Docker volume
`lens-ollama-models`; no host port is published.

## Deploy in Portainer

1. Ensure the external `lens-network` exists.
2. Choose **Stacks → Add stack → Git repository**.
3. Select the `LensExe/lens-be` repository and the `master` reference.
4. Set the Compose path to `deploy/portainer/ollama/ollama-stack.yml`.
5. Add the variables from `env.ollama.example`. The default models are
   `qwen3.5:2b` and `qwen3-embedding:0.6b`.
6. Deploy and wait for the `ollama-init` container to exit with code 0. It
   pulls both models into the persistent volume on first deployment.
7. Deploy `deploy/portainer/ai-worker/ai-worker-stack.yml` after the model
   download finishes. The worker connects to `http://ollama:11434` over the
   shared Docker network.

To use different models, set `AI_CHAT_MODEL` and `AI_EMBEDDING_MODEL` in the
Ollama stack environment and redeploy it. Keep those values identical in the
AI worker stack environment so inference uses the downloaded models.

The Ollama HTTP API is not published to the host or the public network. Other
containers attached to `lens-network` can reach the service as `ollama:11434`.
