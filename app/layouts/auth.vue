<template>
  <div class="grid min-h-svh lg:grid-cols-2">
    <!-- Brand panel: the logo's own diagonal, echoed behind the wordmark. -->
    <div class="ke-brand-gradient relative hidden flex-col justify-between overflow-hidden p-10 lg:flex">
      <div class="relative z-10 rounded-lg bg-white/95 px-5 py-4 shadow-lg w-fit">
        <BrandMark height="h-10" />
      </div>

      <div class="relative z-10 max-w-sm text-white">
        <p class="text-2xl leading-snug font-semibold">
          Every sheet the dispatch team needs, in one place.
        </p>
        <p class="mt-3 text-sm text-white/80">
          Monthly logs, yearly registers and the handful you open every morning — found in seconds,
          archived on their own when the month is done.
        </p>
      </div>

      <!-- A large soft diagonal, matching the slash through the logo mark. -->
      <div
        aria-hidden="true"
        class="pointer-events-none absolute -right-24 -bottom-32 size-96 rotate-45 rounded-[3rem] bg-white/5"
      />
    </div>

    <div class="flex items-center justify-center bg-default p-6">
      <div class="w-full max-w-sm">
        <div class="mb-8 flex justify-center lg:hidden">
          <BrandMark height="h-10" />
        </div>

        <slot />
      </div>
    </div>
  </div>
</template>
