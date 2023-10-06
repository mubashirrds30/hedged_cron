const repository = (container) => {
  const processQueue = [];

  const addProcessToQueue = (processName) => {
    if (isRunningProcess(processName)) {
      var runningProcess = processQueue.filter((x) => x.name == processName)[0];
      runningProcess = JSON.parse(JSON.stringify(runningProcess));
      runningProcess.error = "Process running already!";
      return runningProcess;
    }

    let timeNow = Date.now();
    let processDetails = {
      id: timeNow,
      name: processName,
      error: "",
      poll: "/queue/" + timeNow + "/",
    };

    processQueue.push(processDetails);

    return processDetails;
  };

  const isRunningProcess = (action) => {
    return processQueue.filter((x) => x.name == action).length > 0;
  };

  const getProcessIndex = (id) => {
    for (let procIndex = 0; procIndex < processQueue.length; procIndex++) {
      const process = processQueue[procIndex];

      if (process.id == id) {
        return procIndex;
      }
    }

    return -1;
  };

  const removeProcessFromQueue = (id) => {
    // Remove from queue
    let process;
    let procIndex = getProcessIndex(id);

    if (procIndex > -1) {
      process = processQueue[procIndex];
      processQueue.splice(procIndex, 1);
    }

    return process;
  };

  const updateProcessDetails = (processDetails, error) => {
    // Remove from queue
    let process;
    let procIndex = getProcessIndex(processDetails.id);

    if (procIndex > -1) {
      process = processQueue[procIndex];
      processQueue[procIndex].error = error;
    }

    return process;
  };

  const getProcessDetails = (id) => {
    let process;
    let procIndex = getProcessIndex(id);

    if (procIndex > -1) {
      process = processQueue[procIndex];
    }

    return process;
  };

  return Object.create({
    addProcessToQueue,
    removeProcessFromQueue,
    updateProcessDetails,
    getProcessDetails,
  });
};

const initReopository = () => {
  return repository();
};

module.exports = Object.assign({}, { initReopository });
