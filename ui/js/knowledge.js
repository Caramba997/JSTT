(function () {

  api.get('npmall', undefined, async (response) => {
    if (response.data.fetched) {
      $('[data-a="all-create"]').hide();
      $('[data-e="all-exists"]').html('<i class="fa-solid fa-check"></i>');
    }
  }, (error) => {
    console.warn(error);
    $('[data-e="error"]').show();
  });

  $('[data-a="all-create"]').on('click', async () => {
    progress.init('Fetch all NPM packages (progress in server log)', 100);
    const response = await api.postPromise('npmall', {});
    if (!response || !response.data.success) {
      const alert = $('[data-e="error"]');
      alert.html('Error fetching all packages').show();
      progress.end();
    }
    else {
      $('[data-a="all-create"]').hide();
      $('[data-e="all-exists"]').html('<i class="fa-solid fa-check"></i>');
    }
    progress.setProgress(100, 100);
    progress.end();
  });
})();