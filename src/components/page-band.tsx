export function PageBand({ title }: { title: string }) {
  return (
    <div className="relative overflow-hidden">
      {/* Background image */}
      <div
        className="absolute inset-0 bg-cover bg-center"
        style={{ backgroundImage: "url('https://images.pexels.com/photos/7810361/pexels-photo-7810361.jpeg')" }}
      />
      {/* Darkening overlay */}
      <div className="absolute inset-0 bg-black/60" />
      {/* Title */}
      <div className="relative px-10 py-5 text-center">
        <h1 className="text-xl font-semibold text-white uppercase tracking-widest">{title}</h1>
      </div>
    </div>
  );
}
