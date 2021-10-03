const drag = {
  cs: [],
  onDrag(c) {
    drag.cs.push(c);
  },
};

const drop = async (es) => {
  //   absolutePath: new URL(`file:///${entry.path}`).href;

  let files = [];
  const entries = es

    .map((f) =>
      f.webkitGetAsEntry
        ? f.webkitGetAsEntry()
        : {
            isFile: true,
            file(c) {
              c(f);
            },
          }
    )
    .filter((a) => a);

  const checkEntry = async (entry) => {
    const file = await new Promise((resolve) => entry.file(resolve));
    if (file.type) {
      if (file.type.startsWith('audio/') || file.type.startsWith('video/')) {
        files.push(file);
      }
    } else {
      if (file.name.startsWith('.') === false) {
        //   files.push(file);
      }
    }
  };

  const readEntries = (entry) =>
    new Promise((resolve) => {
      const directoryReader = entry.createReader();
      directoryReader.readEntries(async (entries) => {
        //   console.error('entries: ', entries);
        for (const entry of entries) {
          if (entry.isFile) {
            await checkEntry(entry);
          } else {
            await readEntries(entry);
          }
        }
        resolve();
      });
    });

  for (const entry of entries) {
    if (entry.isFile) {
      await checkEntry(entry);
    } else {
      await readEntries(entry);
    }
  }

  //   files = files.sort((a, b) => parseInt(a.name) - parseInt(b.name));

  //   files = files.sort((a, b) =>
  //     b.name.localeCompare(a.name)
  //   );
  if (files.length) {
    for (const c of drag.cs) {
      c(files);
    }
  }
};

document.addEventListener('drop', (e) => {
  e.preventDefault();
  drop([...e.dataTransfer.items]);
});

document.addEventListener('dragover', (e) => e.preventDefault());
const container = document.getElementById('video-container');
container.addEventListener('dblclick', (e) => {
  if (e.target === container) {
    const input = document.createElement('input');
    input.type = 'file';
    input.multiple = true;
    input.accept = 'video/*, audio/*';
    input.onchange = () => {
      if (input.files.length) {
        drop([...input.files]);
      }
    };
    input.click();
  }
});

document.getElementById('external-link').addEventListener('change', (e) => {
  e.preventDefault();
  const video = document.querySelector('video');
  video.src = e.target.value;
  console.log(e.target.value);
});

export default drag;
